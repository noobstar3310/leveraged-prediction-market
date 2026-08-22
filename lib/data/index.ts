import "server-only";

/**
 * Adapter selection — the one place the backend is chosen.
 *
 * Pages call `getMarketsClient()` and never name an adapter. The predict.fun
 * network comes from a cookie, so the returned client is per-request rather
 * than a module singleton.
 *
 * Set `NEXT_PUBLIC_USE_MOCK_DATA=1` to fall back to the fabricated catalogue,
 * which is useful when the API is down or when working offline.
 */
import type { MarketsClient } from "@/lib/data/clients";
import { getNetwork } from "@/lib/data/network";
import { mockMarketsClient } from "@/lib/data/mock";
import { createPredictClient } from "@/lib/data/predict";

export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "1";

export async function getMarketsClient(): Promise<MarketsClient> {
  if (USE_MOCK_DATA) return mockMarketsClient;
  return createPredictClient(await getNetwork());
}
