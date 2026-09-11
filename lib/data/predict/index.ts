/**
 * Live MarketsClient backed by predict.fun (BNB Chain).
 *
 * Reports `isMockData: false`. Query semantics — search, category, sort, limit
 * and the two counts — are deliberately identical to the mock adapter's, so the
 * browse screen behaves exactly as it did before the pivot.
 */
import {
  MarketDataError,
  type Candle,
  type Market,
  type MarketPage,
  type MarketQuery,
  type MarketsClient,
  type PricePoint,
} from "@/lib/data/clients";
import { getCatalogue } from "@/lib/data/predict/catalogue";
import { getTimeseries, getTimeseriesBatch } from "@/lib/predict/client";
import {
  NETWORK_LABEL,
  isNetworkConfigured,
  type PredictNetwork,
} from "@/lib/predict/config";

const DEFAULT_LIMIT = 60;

function compare(sort: MarketQuery["sort"], now: number) {
  switch (sort) {
    case "volume":
      return (a: Market, b: Market) => b.volumeTotal - a.volumeTotal;
    case "closing":
      // Soonest first. Markets with no published close date sort last rather
      // than to the top — an unknown date must not outrank a known one.
      return (a: Market, b: Market) => {
        const ta = a.closesAt ? Date.parse(a.closesAt) : Number.POSITIVE_INFINITY;
        const tb = b.closesAt ? Date.parse(b.closesAt) : Number.POSITIVE_INFINITY;
        const pa = ta < now ? 1 : 0;
        const pb = tb < now ? 1 : 0;
        return pa !== pb ? pa - pb : ta - tb;
      };
    case "competitive":
      return (a: Market, b: Market) =>
        Math.abs(a.yesPrice - 0.5) - Math.abs(b.yesPrice - 0.5);
    case "active":
    default:
      return (a: Market, b: Market) => b.volume24h - a.volume24h;
  }
}

/** Wraps any lower-level failure so the UI renders its error state. */
async function guard<T>(what: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw new MarketDataError(
      error instanceof Error ? error.message : `Could not ${what}.`,
      error,
    );
  }
}

/** 90 days of daily buckets — the window the sparkline is labelled against. */
const HISTORY_DAYS = 90;

/** Detail-chart window. Shorter than the sparkline's: hourly points over 90
 *  days would be four pages of requests for a chart nobody zooms that far out. */
const CANDLE_DAYS = 30;

/**
 * One client per network.
 *
 * A factory rather than a singleton: the network is chosen per request from a
 * cookie, and a module-level client would pin whichever network happened to be
 * selected when the module was first evaluated.
 */
export function createPredictClient(network: PredictNetwork): MarketsClient {
  // Fail with an explanation rather than a bare 401 from three layers down.
  const assertConfigured = () => {
    if (!isNetworkConfigured(network)) {
      throw new MarketDataError(
        `${NETWORK_LABEL[network]} needs a predict.fun API key. ` +
          `Set PREDICT_API_KEY in .env.local — every mainnet route returns 401 without one.`,
      );
    }
  };

  return {
  async listMarkets(query: MarketQuery = {}): Promise<MarketPage> {
    assertConfigured();
    const { markets, categories } = await guard("load markets", () =>
      getCatalogue(network),
    );

    const needle = query.search?.trim().toLowerCase() ?? "";
    const minVolume = query.minVolume ?? 0;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = Math.max(0, query.offset ?? 0);

    let matched = markets;
    if (needle) {
      matched = matched.filter((m) => m.question.toLowerCase().includes(needle));
    }
    if (query.category) {
      matched = matched.filter((m) => m.category === query.category);
    }
    if (minVolume > 0) {
      matched = matched.filter((m) => m.volumeTotal >= minVolume);
    }

    // Sort a copy — the catalogue array is shared and cached.
    const sorted = [...matched].sort(compare(query.sort, Date.now()));

    return {
      markets: sorted.slice(offset, offset + limit),
      totalMatching: matched.length,
      catalogueSize: markets.length,
      categories,
      isMockData: false,
    };
  },

  async getMarket(slug: string): Promise<Market | null> {
    assertConfigured();
    const { markets } = await guard("load market", () => getCatalogue(network));
    return markets.find((m) => m.slug === slug) ?? null;
  },

  async getHistories(markets: Market[]): Promise<Map<string, PricePoint[]>> {
    const out = new Map<string, PricePoint[]>();
    if (markets.length === 0) return out;

    const ids = markets.map((m) => Number(m.id)).filter(Number.isFinite);
    const fromUnixSec =
      Math.floor(Date.now() / 1000) - 60 * 60 * 24 * HISTORY_DAYS;

    const { byMarket } = await guard("load price history", () =>
      // Daily buckets, not hourly: the batch route caps each market at 250
      // points regardless of `limit` and drops the NEWEST ones when it does,
      // which silently renders a weeks-stale price. Daily fits inside the cap.
      getTimeseriesBatch(network, ids, { resolution: "1d", fromUnixSec }),
    );

    for (const market of markets) {
      const series = byMarket.get(Number(market.id)) ?? [];
      out.set(
        market.id,
        series.map((p) => ({
          date: new Date(p.x * 1000).toISOString(),
          // `y` is a whole-number percentage from this API (49 means 49%).
          // Converted to a probability exactly once, here.
          price: p.y / 100,
        })),
      );
    }
    return out;
  },

  async getCandles(market: Market): Promise<Candle[]> {
    // 30 days of HOURLY points, paginated.
    //
    // Hourly, because the API publishes one probability per bucket and daily
    // buckets would give one value per day — open, high, low and close would
    // all be the same number and every candle would render as a flat tick.
    // Aggregating 24 hourly points into a daily bar produces real bodies and
    // wicks from values the API actually returned.
    //
    // Paginated, because the per-market ceiling is 250 points and it drops the
    // NEWEST ones — an unpaginated request charted a window ending weeks ago.
    const fromUnixSec = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * CANDLE_DAYS;

    const series = await guard("load candles", () =>
      getTimeseries(network, Number(market.id), {
        resolution: "1h",
        fromUnixSec,
      }),
    );
    if (series.length === 0) return [];

    const byDay = new Map<number, number[]>();
    for (const p of series) {
      const day = Math.floor(p.x / 86_400) * 86_400;
      const bucket = byDay.get(day);
      if (bucket) bucket.push(p.y / 100);
      else byDay.set(day, [p.y / 100]);
    }

    return [...byDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([day, values]) => ({
        time: new Date(day * 1000).toISOString().slice(0, 10),
        open: values[0],
        high: Math.max(...values),
        low: Math.min(...values),
        close: values[values.length - 1],
        // The API publishes no per-bar volume. 0 renders an empty histogram,
        // which is honest; a derived figure would be invented.
        volume: 0,
      }));
  },
  };
}
