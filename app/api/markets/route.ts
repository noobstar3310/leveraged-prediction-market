import { NextResponse } from "next/server";

import {
  MARKET_SORTS,
  MarketDataError,
  type MarketSort,
} from "@/lib/data/clients";
import { getMarketsClient } from "@/lib/data";

const MAX_LIMIT = 200;

/**
 * Markets as JSON, for client-side consumption.
 *
 * The markets page does NOT use this — it is a Server Component and calls the
 * adapter directly, which avoids a pointless server-to-self round trip. This
 * route exists as the boundary for the client-side refresh we'll need once
 * prices tick live, and it shares the adapter so both paths behave identically.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const rawSort = params.get("sort") ?? "";
  const sort: MarketSort = (MARKET_SORTS as readonly string[]).includes(rawSort)
    ? (rawSort as MarketSort)
    : "active";

  // Categories come from the source now, so there is no fixed list to validate
  // against. An unknown value simply matches nothing.
  const rawCategory = (params.get("category") ?? "").slice(0, 60);
  const category = rawCategory || undefined;

  const rawLimit = Number(params.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : 60;

  const rawMin = Number(params.get("min"));
  const minVolume = Number.isFinite(rawMin) && rawMin > 0 ? rawMin : 0;

  const rawOffset = Number(params.get("offset"));
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;

  try {
    const client = await getMarketsClient();
    const page = await client.listMarkets({
      search: params.get("q") ?? undefined,
      category,
      sort,
      minVolume,
      limit,
      offset,
    });

    /*
     * Sparklines ride along with the markets.
     *
     * The grid needs a series per card, and a client that fetched markets here
     * and histories somewhere else would render a screenful of empty charts
     * that fill in afterwards. One round trip keeps a card whole.
     *
     * A Map is not JSON, so it is serialised as a plain object keyed by
     * market id.
     */
    const histories = await client.getHistories(page.markets);
    return NextResponse.json({
      ...page,
      histories: Object.fromEntries(histories),
    });
  } catch (error) {
    const message =
      error instanceof MarketDataError
        ? error.message
        : "Failed to load markets.";
    // 502: we're a healthy gateway reporting an unhealthy upstream.
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
