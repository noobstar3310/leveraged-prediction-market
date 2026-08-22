import "server-only";

import { cookies } from "next/headers";

import {
  DEFAULT_NETWORK,
  parseNetwork,
  type PredictNetwork,
} from "@/lib/predict/config";

/**
 * Which predict.fun network this request reads from.
 *
 * A cookie rather than a query string: the choice has to survive navigation
 * between the markets grid, a detail page and the portfolio, and threading a
 * `?network=` through every link would be one forgotten href away from a page
 * that silently reads the other network.
 */
export const NETWORK_COOKIE = "predict-network";

export async function getNetwork(): Promise<PredictNetwork> {
  const store = await cookies();
  return parseNetwork(store.get(NETWORK_COOKIE)?.value) ?? DEFAULT_NETWORK;
}
