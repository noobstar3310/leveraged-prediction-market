/**
 * The data seam.
 *
 * Everything the UI knows about markets and positions is defined here. Components
 * import these types; they never import an adapter, and they never see a vendor's
 * response shape. Swapping Polymarket for our own Solana program means writing a
 * new implementation of these interfaces — not touching components.
 *
 * See CLAUDE.md "Architecture rules".
 */

export const MARKET_CATEGORIES = [
  "Politics",
  "Crypto",
  "Economics",
  "Geopolitics",
  "Tech",
  "Sports",
  "Science",
  "Culture",
] as const;
export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

/** A binary outcome market. Prices are probabilities in [0, 1], not currency. */
export type Market = {
  /** Our stable identifier for this market. */
  id: string;
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
  /** ISO 8601 timestamp for when the market stops accepting trades. */
  closesAt: string;
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
  /**
   * True when these markets are fabricated rather than real. The UI must say so
   * — the design system forbids presenting invented figures as real data, and
   * every price and volume here is invented. Flips to false automatically once
   * a real adapter backs this interface.
   */
  isMockData: boolean;
};

export interface MarketsClient {
  listMarkets(query?: MarketQuery): Promise<MarketPage>;
  /** A single market by slug, or null when it doesn't exist. */
  getMarket(slug: string): Promise<Market | null>;
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
