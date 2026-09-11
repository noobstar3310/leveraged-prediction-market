/**
 * The data seam.
 *
 * Everything the UI knows about markets and positions is defined here. Components
 * import these types; they never import an adapter, and they never see a vendor's
 * response shape. Swapping one backend for another means writing a new
 * implementation of these interfaces — not touching components.
 *
 * See CLAUDE.md "Architecture rules".
 */

/**
 * Categories are DATA, not a fixed union.
 *
 * They used to be a hardcoded list of eight. They now come from whatever the
 * live source actually returns, because a filter bar that offers "Science" when
 * no market is tagged Science is a filter that always yields nothing. The UI
 * receives the available set alongside the markets and renders that.
 */
export type MarketCategory = string;

/** A binary outcome market. Prices are probabilities in [0, 1], not currency. */
export type Market = {
  /** Our stable identifier for this market. */
  id: string;
  /**
   * What the two sides are actually called on this market.
   *
   * Optional, defaulting to Yes/No — most markets are phrased that way, but
   * predict.fun also runs Up/Down crypto markets and sports variants. Labelling
   * an "Up" outcome as "Yes" would misstate what is being bought, so the UI
   * reads this rather than hardcoding.
   *
   * Index 0 is the outcome `yesPrice` refers to; index 1 is its complement. The
   * internal side names stay "yes"/"no" because they are structural — only the
   * words shown to a trader change.
   */
  outcomeLabels?: [string, string];
  /** URL-safe identifier used for routing. */
  slug: string;
  /** The full question text, e.g. "Will the Fed cut rates in September?" */
  question: string;
  /** Broad grouping, used for browse filtering. */
  category: MarketCategory;
  /** Probability the market assigns to YES, in [0, 1]. */
  yesPrice: number;
  /** Probability the market assigns to NO, in [0, 1]. Normally 1 - yesPrice. */
  noPrice: number;
  /** Trailing 24h traded volume, in USD. */
  volume24h: number;
  /** All-time traded volume, in USD. */
  volumeTotal: number;
  /**
   * ISO 8601 timestamp for when the market stops accepting trades, or null when
   * the source genuinely doesn't publish one. Nullable on purpose: inventing a
   * close date would be fabricating data a trader might size a position against.
   */
  closesAt: string | null;
};

/** One point on a probability series. */
export type PricePoint = {
  /** ISO 8601. */
  date: string;
  /** Probability of YES in [0, 1]. */
  price: number;
};

/**
 * One OHLC bar of YES probability.
 *
 * `time` is a `YYYY-MM-DD` day stamp — lightweight-charts' business-day form,
 * which is what the chart component already consumes.
 */
export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export const MARKET_SORTS = ["active", "volume", "closing", "competitive"] as const;
export type MarketSort = (typeof MARKET_SORTS)[number];

export type MarketQuery = {
  /** Case-insensitive substring match against the question text. */
  search?: string;
  /** Restrict to a single category. Omit for all. */
  category?: MarketCategory;
  /** Ordering for the result set. Defaults to "active". */
  sort?: MarketSort;
  /** Hide markets below this all-time volume, in USD. */
  minVolume?: number;
  /** Maximum markets to return. The catalogue is far larger than any page. */
  limit?: number;
  /**
   * How many matches to skip before the returned slice.
   *
   * Offset, not a cursor: the catalogue is held in memory and queried locally,
   * so paging is an array slice. The upstream API's cursor never reaches here.
   */
  offset?: number;
};

/**
 * A slice of the catalogue plus the counts a browse UI needs to explain itself
 * — "showing 60 of 1,240 matches" is only possible if the client is told both.
 */
export type MarketPage = {
  /** The markets to render — at most `query.limit`. */
  markets: Market[];
  /** How many markets matched the query before the limit was applied. */
  totalMatching: number;
  /** How many markets exist in total, ignoring the query. */
  catalogueSize: number;
  /** Every category present in the catalogue, for the filter bar. */
  categories: MarketCategory[];
  /**
   * True when these markets are fabricated rather than real. The UI must say so
   * — the design system forbids presenting invented figures as real data.
   * False for any adapter backed by a live source.
   */
  isMockData: boolean;
};

export interface MarketsClient {
  listMarkets(query?: MarketQuery): Promise<MarketPage>;
  /** A single market by slug, or null when it doesn't exist. */
  getMarket(slug: string): Promise<Market | null>;
  /**
   * Probability history for a set of markets, keyed by market id.
   *
   * Batched rather than per-market: a card grid needs a sparkline for every
   * tile at once, and one request for six series beats six requests. A market
   * with no history maps to an empty array — never to invented points.
   */
  getHistories(markets: Market[]): Promise<Map<string, PricePoint[]>>;
  /** OHLC bars for the detail chart. */
  getCandles(market: Market): Promise<Candle[]>;
}

/**
 * Thrown when a market data source is unreachable or returns something we can't
 * use. The UI catches this to render an error state — never a blank grid, which
 * reads to a user as "no markets exist" rather than "the request failed".
 */
export class MarketDataError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}

/** The two side labels for a market, defaulting to Yes/No. */
export const outcomeLabels = (market: Market): [string, string] =>
  market.outcomeLabels ?? ["Yes", "No"];
