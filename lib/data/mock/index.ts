/**
 * Mock MarketsClient.
 *
 * All market data is fabricated — see ./markets. This adapter reports
 * `isMockData: true` so the UI can label it, which the design system requires
 * for any figure that isn't real.
 *
 * Replacing this with a live source means writing another MarketsClient. No
 * component changes: components consume the interface in lib/data/clients.ts and
 * never import an adapter directly.
 */

import type {
  Candle,
  Market,
  MarketPage,
  MarketQuery,
  MarketsClient,
  PricePoint,
} from "@/lib/data/clients";
import { MOCK_MARKETS } from "@/lib/data/mock/markets";
import { candlesFor } from "@/lib/data/mock/candles";
import { priceHistoryFor } from "@/lib/data/mock/price-history";

const DEFAULT_LIMIT = 60;

function compare(sort: MarketQuery["sort"], now: number) {
  switch (sort) {
    case "volume":
      return (a: Market, b: Market) => b.volumeTotal - a.volumeTotal;
    case "closing":
      // Soonest first, but markets whose close date has already passed sort last
      // rather than to the top — a stale end date shouldn't outrank live ones.
      return (a: Market, b: Market) => {
        const ta = a.closesAt ? Date.parse(a.closesAt) : Number.POSITIVE_INFINITY;
        const tb = b.closesAt ? Date.parse(b.closesAt) : Number.POSITIVE_INFINITY;
        const pa = ta < now ? 1 : 0;
        const pb = tb < now ? 1 : 0;
        return pa !== pb ? pa - pb : ta - tb;
      };
    case "competitive":
      // Closest to a coin flip first.
      return (a: Market, b: Market) =>
        Math.abs(a.yesPrice - 0.5) - Math.abs(b.yesPrice - 0.5);
    case "active":
    default:
      return (a: Market, b: Market) => b.volume24h - a.volume24h;
  }
}

export const mockMarketsClient: MarketsClient = {
  async listMarkets(query: MarketQuery = {}): Promise<MarketPage> {
    const needle = query.search?.trim().toLowerCase() ?? "";
    const minVolume = query.minVolume ?? 0;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = Math.max(0, query.offset ?? 0);

    let matched = MOCK_MARKETS;
    if (needle) {
      matched = matched.filter((m) =>
        m.question.toLowerCase().includes(needle),
      );
    }
    if (query.category) {
      matched = matched.filter((m) => m.category === query.category);
    }
    if (minVolume > 0) {
      matched = matched.filter((m) => m.volumeTotal >= minVolume);
    }

    // Sort a copy — MOCK_MARKETS is a shared module-level array.
    const sorted = [...matched].sort(compare(query.sort, Date.now()));

    return {
      markets: sorted.slice(offset, offset + limit),
      totalMatching: matched.length,
      catalogueSize: MOCK_MARKETS.length,
      categories: [...new Set(MOCK_MARKETS.map((m) => m.category))].sort(),
      isMockData: true,
    };
  },

  async getMarket(slug: string): Promise<Market | null> {
    return MOCK_MARKETS.find((market) => market.slug === slug) ?? null;
  },

  async getHistories(markets: Market[]): Promise<Map<string, PricePoint[]>> {
    return new Map(markets.map((m) => [m.id, priceHistoryFor(m)]));
  },

  async getCandles(market: Market): Promise<Candle[]> {
    return candlesFor(market);
  },
};
