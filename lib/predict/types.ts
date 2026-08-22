/**
 * Types transcribed from SCHEMA.md — observed shapes, not the published SDK.
 *
 * Anything the API delivers as a string that *looks* numeric is typed as string
 * here and normalised at the client boundary (client.ts), so nothing downstream
 * has to remember which endpoint is inconsistent. See SCHEMA.md §4.1.
 */

export type PriceLevel = { price: number; size: number };

export type Outcome = {
  name: string;
  /** 1 for the first outcome, 2 for the second. Books quote against 1. */
  indexSet: number;
  /** uint256 as a decimal string — never coerce to Number. */
  onChainId: string;
  bestBid: PriceLevel | null;
  bestAsk: PriceLevel | null;
};

export type MarketStats = {
  volume24hUsd: number;
  volumeTotalUsd: number;
  totalLiquidityUsd: number;
  liquidity3cAskUsd: number;
};

export type Market = {
  id: number;
  title: string;
  question: string;
  categorySlug: string;
  status: string;
  tradingStatus: string;
  outcomes: Outcome[];
  /** Only present when the request set includeStats=true. */
  stats?: MarketStats;
  createdAt: string;
};

export type Category = {
  slug: string;
  title: string;
  shortTitle: string | null;
  /** Markets carry no close time of their own — it lives here. SCHEMA.md §3. */
  endsAt: string | null;
  startsAt: string | null;
  tags: { id: string; name: string; level: number }[];
};

/** `y` is a WHOLE-NUMBER PERCENTAGE (49 means 49%), not a probability. §7. */
export type SeriesPoint = { x: number; y: number };

export type MarketSeries = { marketId: number; series: SeriesPoint[] };
