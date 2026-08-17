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
  Market,
  MarketPage,
  MarketQuery,
  MarketsClient,
} from "@/lib/data/clients";
import { MOCK_MARKETS } from "@/lib/data/mock/markets";

const DEFAULT_LIMIT = 60;

function compare(sort: MarketQuery["sort"], now: number) {
  switch (sort) {
    case "volume":
      return (a: Market, b: Market) => b.volumeTotal - a.volumeTotal;
    case "closing":
      // Soonest first, but markets whose close date has already passed sort last
      // rather than to the top — a stale end date shouldn't outrank live ones.
      return (a: Market, b: Market) => {
        const ta = Date.parse(a.closesAt);
        const tb = Date.parse(b.closesAt);
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
      markets: sorted.slice(0, limit),
      totalMatching: matched.length,
      catalogueSize: MOCK_MARKETS.length,
      isMockData: true,
    };
  },

  async getMarket(slug: string): Promise<Market | null> {
    return MOCK_MARKETS.find((market) => market.slug === slug) ?? null;
  },
};
