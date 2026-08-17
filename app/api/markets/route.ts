import { NextResponse } from "next/server";

import {
  MARKET_CATEGORIES,
  MARKET_SORTS,
  MarketDataError,
  type MarketCategory,
  type MarketSort,
} from "@/lib/data/clients";
import { mockMarketsClient } from "@/lib/data/mock";

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

  const rawCategory = params.get("category") ?? "";
  const category = (MARKET_CATEGORIES as readonly string[]).includes(rawCategory)
    ? (rawCategory as MarketCategory)
    : undefined;

  const rawLimit = Number(params.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : 60;

  const rawMin = Number(params.get("min"));
  const minVolume = Number.isFinite(rawMin) && rawMin > 0 ? rawMin : 0;

  try {
    const page = await mockMarketsClient.listMarkets({
      search: params.get("q") ?? undefined,
      category,
      sort,
      minVolume,
      limit,
    });
    return NextResponse.json(page);
  } catch (error) {
    const message =
      error instanceof MarketDataError
        ? error.message
        : "Failed to load markets.";
    // 502: we're a healthy gateway reporting an unhealthy upstream.
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
