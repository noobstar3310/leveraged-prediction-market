import "server-only";

import { cookies } from "next/headers";

import {
  DEFAULT_NETWORK,
  isNetworkConfigured,
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
  const chosen = parseNetwork(store.get(NETWORK_COOKIE)?.value);

  /*
   * Fall back rather than dead-end.
   *
   * A fresh visitor has no cookie and lands on testnet already. But a returning
   * one who switched to mainnet keeps that cookie for a year — and with no
   * PREDICT_API_KEY every mainnet route 401s, so they would land on an error
   * page with no markets and no obvious way back. Serving testnet instead means
   * the site always opens on markets that actually load.
   *
   * The toggle still shows mainnet as selectable; this only governs what gets
   * FETCHED when the selected network cannot answer.
   */
  if (!isNetworkConfigured(chosen)) return DEFAULT_NETWORK;
  return chosen;
}
