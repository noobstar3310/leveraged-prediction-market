/**
 * Builds and caches the market catalogue from predict.fun.
 *
 * Why a catalogue rather than a per-request query: the browse screen needs text
 * search, category filtering, four sort orders and a total count. This API
 * offers none of those (its `/search` returns 500, and its sort enum has no
 * "competitive"), so the catalogue is fetched once and queried in memory —
 * which also keeps every browse interaction off the network entirely.
 *
 * Cost of a build is roughly 6 list pages plus one lookup per distinct category
 * (~83 on testnet today). That is why it is cached hard and shared.
 */
import {
  NotFoundError,
  getCategory,
  getLatestChances,
  sweepMarkets,
} from "@/lib/predict/client";
import type { PredictNetwork } from "@/lib/predict/config";
import type { Category, Market as ApiMarket } from "@/lib/predict/types";
import type { Market } from "@/lib/data/clients";

export type Catalogue = {
  markets: Market[];
  categories: string[];
  builtAt: number;
  /** Our slug -> predict.fun numeric id, for follow-up calls. */
  apiIdBySlug: Map<string, number>;
};

const TTL_MS = 10 * 60_000;

/**
 * Parked on globalThis, not a module local.
 *
 * Next bundles Server Components and Route Handlers separately, so a
 * module-level cache is instantiated more than once and each copy pays the full
 * build cost. This exact bug bit the mock catalogue before.
 */
type Slot = { value: Catalogue | null; inflight: Promise<Catalogue> | null };

const g = globalThis as unknown as {
  __predictCatalogueByNetwork?: Map<PredictNetwork, Slot>;
};

/**
 * Keyed BY NETWORK. Testnet and mainnet are different universes of markets, and
 * a single shared slot would serve one network's catalogue after a switch to
 * the other — silently, and looking perfectly correct.
 *
 * The `instanceof` guard matters in dev: the global survives hot reloads, so
 * after this module's shape changes the previous value is still sitting there.
 * `??=` alone happily reuses it and every call then fails on a method that no
 * longer exists.
 */
const cacheByNetwork: Map<PredictNetwork, Slot> =
  g.__predictCatalogueByNetwork instanceof Map
    ? g.__predictCatalogueByNetwork
    : (g.__predictCatalogueByNetwork = new Map<PredictNetwork, Slot>());

const slotFor = (network: PredictNetwork): Slot => {
  const existing = cacheByNetwork.get(network);
  if (existing) return existing;
  const created: Slot = { value: null, inflight: null };
  cacheByNetwork.set(network, created);
  return created;
};

const isBinaryYesNo = (m: ApiMarket) =>
  m.outcomes.length === 2 &&
  m.outcomes.some((o) => o.name.toLowerCase() === "yes") &&
  m.outcomes.some((o) => o.name.toLowerCase() === "no");

/** Stable, unique, readable. The API's own categorySlug is shared by siblings. */
function slugFor(m: ApiMarket): string {
  const base = (m.question || m.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return `${base || "market"}-${m.id}`;
}

/**
 * Last-resort price from top of book, used only when a market has no published
 * `chance` at all.
 *
 * NOT the primary source, and deliberately so. Testnet books are frequently
 * enormous — one live market quotes YES at bid 0.01 / ask 0.42 — and the
 * midpoint of a 41-point spread is not a price anyone could trade at. It is the
 * average of two numbers that have nothing to do with each other.
 *
 * Worse, using it contradicted the chart drawn directly above it: the chart
 * plots `chance`, so a market showing 0.42 on the chart displayed 0.215 in the
 * panel. CLAUDE.md is explicit that a chart disagreeing with the number beside
 * it is worse than no chart.
 */
function midFromBook(m: ApiMarket): number | null {
  const yes = m.outcomes.find((o) => o.indexSet === 1);
  const bid = yes?.bestBid?.price;
  const ask = yes?.bestAsk?.price;
  if (bid == null || ask == null) return null;
  return (bid + ask) / 2;
}

async function build(network: PredictNetwork): Promise<Catalogue> {
  const raw = await sweepMarkets(network, {
    sort: "VOLUME_TOTAL_DESC",
    maxPages: 6,
  });
  const binary = raw.filter((m) => isBinaryYesNo(m) && m.tradingStatus === "OPEN");

  // Resolve each distinct category once, not once per market — the NBA markets
  // alone share one category across dozens of rows.
  const slugs = [...new Set(binary.map((m) => m.categorySlug))];
  const categoryBySlug = new Map<string, Category | null>();
  await Promise.all(
    slugs.map(async (slug) => {
      try {
        categoryBySlug.set(slug, await getCategory(network, slug));
      } catch (error) {
        // A removed category costs us a label, nothing more. Anything else is a
        // real failure and must surface rather than be swallowed.
        if (error instanceof NotFoundError) categoryBySlug.set(slug, null);
        else throw error;
      }
    }),
  );

  // predict.fun's own published probability — the SAME series the charts draw.
  // One request per 20 markets, so ~15 for the whole catalogue.
  const chanceById = await getLatestChances(
    network,
    binary.map((m) => m.id),
  );

  const apiIdBySlug = new Map<string, number>();
  const markets: Market[] = binary.map((m) => {
    const cat = categoryBySlug.get(m.categorySlug) ?? null;
    const slug = slugFor(m);
    apiIdBySlug.set(slug, m.id);

    // Order of preference: the published chance (what the chart shows), then
    // the book mid, then 0.5. The last is the only non-committal value when a
    // market has neither, and reads as a coin flip rather than as a
    // confident-looking invention.
    const yesPrice = chanceById.get(m.id) ?? midFromBook(m) ?? 0.5;

    return {
      id: String(m.id),
      slug,
      question: m.question || m.title,
      // Level-1 tag is the broad grouping; deeper tags are Ligue 1 / Dota 2.
      category:
        cat?.tags.find((t) => t.level === 1)?.name ??
        cat?.tags[0]?.name ??
        "Untagged",
      yesPrice,
      noPrice: 1 - yesPrice,
      volume24h: m.stats?.volume24hUsd ?? 0,
      volumeTotal: m.stats?.volumeTotalUsd ?? 0,
      closesAt: cat?.endsAt ?? null,
    };
  });

  const categories = [...new Set(markets.map((m) => m.category))].sort((a, b) =>
    a === "Untagged" ? 1 : b === "Untagged" ? -1 : a.localeCompare(b),
  );

  return { markets, categories, builtAt: Date.now(), apiIdBySlug };
}

/** Cached accessor, per network. Concurrent callers share one in-flight build. */
export async function getCatalogue(
  network: PredictNetwork,
): Promise<Catalogue> {
  const cache = slotFor(network);

  if (cache.value && Date.now() - cache.value.builtAt < TTL_MS) {
    return cache.value;
  }
  if (cache.inflight) return cache.inflight;

  cache.inflight = build(network)
    .then((c) => {
      cache.value = c;
      return c;
    })
    .finally(() => {
      cache.inflight = null;
    });

  try {
    return await cache.inflight;
  } catch (error) {
    // A failed rebuild must not discard a usable previous catalogue.
    if (cache.value) return cache.value;
    throw error;
  }
}
