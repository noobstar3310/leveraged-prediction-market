/**
 * Thin typed HTTP client for the predict.fun REST API.
 *
 * Two rules drive the design, both from the brief:
 *
 * 1. Fail loudly. The API is in beta. If a payload stops matching SCHEMA.md we
 *    want a thrown error naming the endpoint, not `undefined` propagating into
 *    a chart. Every parse below asserts rather than defaulting.
 * 2. Never trust `data` on its own. Error bodies are structurally valid JSON
 *    and still carry a `success` key — reading `body.data?.x ?? []` renders a
 *    failure as an empty result. That mistake produced a wrong finding during
 *    schema discovery, so the check is centralised here and done exactly once.
 */
import { apiKeyFor, baseUrlFor, type PredictNetwork } from "./config";
import { throttle } from "./limiter";
import type { Category, Market, MarketSeries, SeriesPoint } from "./types";

export class PredictApiError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
    readonly detail: string,
    /** Present on API-generated errors; the only handle for a beta bug report. */
    readonly trace?: string,
  ) {
    super(`${path} -> ${status}: ${detail}`);
    this.name = "PredictApiError";
  }
}

/** Thrown when a 200 body does not match SCHEMA.md. Never swallowed. */
export class SchemaMismatchError extends Error {
  constructor(path: string, detail: string) {
    super(
      `${path}: response did not match SCHEMA.md — ${detail}. ` +
        `The API is in beta; the shape may have changed upstream.`,
    );
    this.name = "SchemaMismatchError";
  }
}

const RETRIABLE = (s: number) => s === 429 || s >= 500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Envelope = { success?: boolean; data?: unknown; cursor?: string } & Record<
  string,
  unknown
>;

async function request(
  network: PredictNetwork,
  path: string,
  attempt = 0,
): Promise<Envelope> {
  const apiKey = apiKeyFor(network);
  const res = await throttle(() =>
    fetch(`${baseUrlFor(network)}/v1${path}`, {
      headers: {
        accept: "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      // Next 16 does not cache fetch by default. Market data is live, but a
      // board rebuild every few seconds would burn the rate limit for nothing.
      next: { revalidate: 30 },
    }),
  );

  const text = await res.text();
  let body: Envelope;
  try {
    body = JSON.parse(text) as Envelope;
  } catch {
    if (RETRIABLE(res.status) && attempt < 3) {
      await sleep(2 ** attempt * 500);
      return request(network, path, attempt + 1);
    }
    throw new PredictApiError(path, res.status, text.slice(0, 200));
  }

  if (!res.ok || body.success === false) {
    // 4xx is a bug in our request; retrying just spends rate limit. 429/5xx are
    // worth backing off for.
    if (RETRIABLE(res.status) && attempt < 3) {
      await sleep(2 ** attempt * 500);
      return request(network, path, attempt + 1);
    }
    throw new PredictApiError(
      path,
      res.status,
      String(body.message ?? body.error ?? text.slice(0, 200)),
      typeof body.trace === "string" ? body.trace : undefined,
    );
  }

  if (body.data === undefined) {
    throw new SchemaMismatchError(path, "no `data` key on a successful response");
  }
  return body;
}

/** Numeric-looking strings are normalised here so nothing downstream cares. */
const num = (v: unknown, path: string, field: string): number => {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new SchemaMismatchError(path, `\`${field}\` is not numeric (got ${JSON.stringify(v)})`);
  }
  return n;
};

function parseMarket(raw: unknown, path: string): Market {
  if (!raw || typeof raw !== "object") {
    throw new SchemaMismatchError(path, "market row is not an object");
  }
  const m = raw as Record<string, unknown>;
  if (typeof m.id !== "number") {
    throw new SchemaMismatchError(path, "market.id is not a number");
  }
  if (!Array.isArray(m.outcomes)) {
    throw new SchemaMismatchError(path, `market ${m.id} has no outcomes array`);
  }
  return {
    id: m.id,
    title: String(m.title ?? ""),
    question: String(m.question ?? ""),
    categorySlug: String(m.categorySlug ?? ""),
    status: String(m.status ?? ""),
    tradingStatus: String(m.tradingStatus ?? ""),
    createdAt: String(m.createdAt ?? ""),
    outcomes: (m.outcomes as Record<string, unknown>[]).map((o) => ({
      name: String(o.name ?? ""),
      indexSet: num(o.indexSet, path, "outcome.indexSet"),
      // uint256 — kept as a string on purpose.
      onChainId: String(o.onChainId ?? ""),
      bestBid: o.bestBid ? (o.bestBid as never) : null,
      bestAsk: o.bestAsk ? (o.bestAsk as never) : null,
    })),
    stats: m.stats
      ? {
          volume24hUsd: num((m.stats as Record<string, unknown>).volume24hUsd, path, "volume24hUsd"),
          volumeTotalUsd: num((m.stats as Record<string, unknown>).volumeTotalUsd, path, "volumeTotalUsd"),
          totalLiquidityUsd: num((m.stats as Record<string, unknown>).totalLiquidityUsd, path, "totalLiquidityUsd"),
          liquidity3cAskUsd: num((m.stats as Record<string, unknown>).liquidity3cAskUsd, path, "liquidity3cAskUsd"),
        }
      : undefined,
  };
}

export type MarketSort =
  | "VOLUME_24H_DESC"
  | "VOLUME_TOTAL_DESC"
  | "CHANCE_24H_CHANGE_DESC";

export async function listMarkets(
  network: PredictNetwork,
  opts: {
  first?: number;
  /** Filter enum is OPEN|RESOLVED — NOT the values the `status` field returns. */
  status?: "OPEN" | "RESOLVED";
  sort?: MarketSort;
  includeStats?: boolean;
  after?: string;
  } = {},
): Promise<{ markets: Market[]; cursor?: string }> {
  const q = new URLSearchParams();
  // Page size is `first`. `limit`/`pageSize`/`take` are silently ignored.
  q.set("first", String(opts.first ?? 20));
  if (opts.status) q.set("status", opts.status);
  if (opts.sort) q.set("sort", opts.sort);
  if (opts.includeStats) q.set("includeStats", "true");
  if (opts.after) q.set("after", opts.after);

  const path = `/markets?${q}`;
  const body = await request(network, path);
  if (!Array.isArray(body.data)) {
    throw new SchemaMismatchError(path, "`data` is not an array");
  }
  return {
    markets: body.data.map((r) => parseMarket(r, path)),
    cursor: typeof body.cursor === "string" ? body.cursor : undefined,
  };
}

/** Thrown only when the category is genuinely absent (404). */
export class NotFoundError extends Error {
  constructor(readonly path: string) {
    super(`${path} -> 404`);
    this.name = "NotFoundError";
  }
}

export async function getCategory(
  network: PredictNetwork,
  slug: string,
): Promise<Category> {
  const path = `/categories/${encodeURIComponent(slug)}`;
  let body;
  try {
    body = await request(network, path);
  } catch (error) {
    if (error instanceof PredictApiError && error.status === 404) {
      throw new NotFoundError(path);
    }
    throw error;
  }
  const c = body.data as Record<string, unknown>;
  return {
    slug: String(c.slug ?? slug),
    title: String(c.title ?? ""),
    shortTitle: c.shortTitle ? String(c.shortTitle) : null,
    endsAt: c.endsAt ? String(c.endsAt) : null,
    startsAt: c.startsAt ? String(c.startsAt) : null,
    tags: Array.isArray(c.tags)
      ? (c.tags as Record<string, unknown>[]).map((t) => ({
          // tag ids arrive as strings while every sibling id is a number.
          id: String(t.id ?? ""),
          name: String(t.name ?? ""),
          level: Number(t.level ?? 0),
        }))
      : [],
  };
}

/**
 * Batch history. One request for the whole board rather than one per card —
 * the single biggest rate-limit saving available. `data` here is
 * `{markets: [...]}`, a different shape from both the list routes and the
 * single-market timeseries route. SCHEMA.md §7.
 */
export async function getTimeseriesBatch(
  network: PredictNetwork,
  ids: number[],
  opts: { resolution?: "1m" | "5m" | "1h" | "1d" | "1w" | "1M"; fromUnixSec: number },
): Promise<{ byMarket: Map<number, SeriesPoint[]>; truncated: boolean }> {
  if (ids.length === 0) return { byMarket: new Map(), truncated: false };
  const q = new URLSearchParams({
    ids: ids.join(","),
    // The metric enum has exactly one member.
    metric: "chance",
    resolution: opts.resolution ?? "1h",
    // Unix SECONDS. Passing milliseconds is accepted and yields nothing useful.
    from: String(opts.fromUnixSec),
    limit: "1000",
  });
  const path = `/markets/timeseries?${q}`;
  const body = await request(network, path);
  const d = body.data as { markets?: unknown };
  if (!d || !Array.isArray(d.markets)) {
    throw new SchemaMismatchError(path, "`data.markets` is not an array");
  }
  const out = new Map<number, SeriesPoint[]>();
  // A cursor here means the batch hit its per-market ceiling. That ceiling is
  // 250 points per market and is NOT raised by `limit` — and the points it
  // drops are the most recent ones, so a truncated series shows a stale price
  // while looking perfectly healthy. Report it rather than render it.
  const truncated = typeof body.cursor === "string" && body.cursor.length > 0;
  for (const entry of d.markets as MarketSeries[]) {
    if (typeof entry.marketId !== "number" || !Array.isArray(entry.series)) {
      throw new SchemaMismatchError(path, "series entry missing marketId/series");
    }
    out.set(
      entry.marketId,
      entry.series.map((p) => ({
        x: num(p.x, path, "series.x"),
        // Whole-number percent. Left as-is here; converted once, in board.ts.
        y: num(p.y, path, "series.y"),
      })),
    );
  }
  return { byMarket: out, truncated };
}

/**
 * Walks the market list to exhaustion (or `maxPages`), following the cursor.
 *
 * Page size is `first`; the cursor is read from `cursor` and sent back as
 * `after`. `limit`/`pageSize`/`take` are silently ignored by this API, so a
 * caller that passes them gets 20 rows and no error.
 */
export async function sweepMarkets(
  network: PredictNetwork,
  opts: {
  sort?: MarketSort;
  maxPages?: number;
  perPage?: number;
  },
): Promise<Market[]> {
  const perPage = opts.perPage ?? 100;
  const maxPages = opts.maxPages ?? 6;
  const out: Market[] = [];
  let after: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const { markets, cursor } = await listMarkets(network, {
      first: perPage,
      status: "OPEN",
      sort: opts.sort ?? "VOLUME_TOTAL_DESC",
      includeStats: true,
      after,
    });
    if (markets.length === 0) break;
    out.push(...markets);
    // No `total` and no `hasMore` on this API — an absent cursor is the only
    // termination signal.
    if (!cursor) break;
    after = cursor;
  }
  return out;
}

/**
 * Full history for ONE market, following the cursor to exhaustion.
 *
 * Necessary because the per-market ceiling is 250 points regardless of `limit`,
 * and truncation drops the NEWEST points — an unpaginated hourly request for a
 * month returns the first ten days and looks perfectly healthy while being
 * weeks stale. Note `data` here is `{resolution, series}`, a different shape
 * from the batch route's `{markets: [...]}`.
 */
export async function getTimeseries(
  network: PredictNetwork,
  id: number,
  opts: {
    resolution?: "1m" | "5m" | "1h" | "1d" | "1w" | "1M";
    fromUnixSec: number;
    maxPages?: number;
  },
): Promise<SeriesPoint[]> {
  const maxPages = opts.maxPages ?? 8;
  const out: SeriesPoint[] = [];
  let after: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const q = new URLSearchParams({
      metric: "chance",
      resolution: opts.resolution ?? "1h",
      from: String(opts.fromUnixSec),
      limit: "1000",
    });
    if (after) q.set("after", after);

    const path = `/markets/${id}/timeseries?${q}`;
    const body = await request(network, path);
    const d = body.data as { series?: unknown };
    if (!d || !Array.isArray(d.series)) {
      throw new SchemaMismatchError(path, "`data.series` is not an array");
    }
    const series = d.series as SeriesPoint[];
    for (const p of series) {
      out.push({ x: num(p.x, path, "series.x"), y: num(p.y, path, "series.y") });
    }
    if (series.length === 0 || typeof body.cursor !== "string" || !body.cursor) {
      break;
    }
    after = body.cursor;
  }
  return out;
}

/**
 * Latest `chance` for many markets.
 *
 * This is predict.fun's own published probability — the same number the
 * timeseries chart draws. Using it as the market price is what keeps the chart,
 * the header and the trade panel from contradicting each other.
 *
 * Chunked at 20: unlike `/markets/quotes` (500 ids), this route rejects more
 * than 20 with `ids must contain between 1 and 20 entries`.
 */
export async function getLatestChances(
  network: PredictNetwork,
  ids: number[],
): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  const CHUNK = 20;

  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const path = `/markets/timeseries/latest?ids=${chunk.join(",")}&metric=chance`;
    const body = await request(network, path);
    if (!Array.isArray(body.data)) {
      throw new SchemaMismatchError(path, "`data` is not an array");
    }
    for (const row of body.data as { marketId: number; y: number }[]) {
      if (typeof row.marketId !== "number") {
        throw new SchemaMismatchError(path, "row missing marketId");
      }
      // Whole-number percentage, as everywhere else on this metric.
      out.set(row.marketId, num(row.y, path, "y") / 100);
    }
  }
  return out;
}
