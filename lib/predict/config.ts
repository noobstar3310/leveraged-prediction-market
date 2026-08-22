/**
 * Network selection for the predict.fun API.
 *
 * Testnet and mainnet share an endpoint surface, so switching is a base-URL
 * change plus a header — see SCHEMA.md §1. The network is chosen per request
 * (the UI has a toggle), never baked in at module scope.
 */
export type PredictNetwork = "testnet" | "mainnet";

export const NETWORKS: PredictNetwork[] = ["testnet", "mainnet"];

const BASE_URL_BY_NETWORK: Record<PredictNetwork, string> = {
  testnet: process.env.PREDICT_TESTNET_BASE_URL ?? "https://api-testnet.predict.fun",
  mainnet: process.env.PREDICT_BASE_URL ?? "https://api.predict.fun",
};

export const baseUrlFor = (network: PredictNetwork): string =>
  BASE_URL_BY_NETWORK[network];

/**
 * API keys, server-side only.
 *
 * Deliberately NOT NEXT_PUBLIC_. Market data is fetched in Server Components,
 * so the key never reaches the browser — keep it that way. Testnet reads are
 * open and need no key; mainnet returns 401 on every route without one.
 */
export const apiKeyFor = (network: PredictNetwork): string | undefined =>
  network === "mainnet"
    ? process.env.PREDICT_API_KEY?.trim() || undefined
    : process.env.PREDICT_TESTNET_API_KEY?.trim() || undefined;

/**
 * Whether a mainnet key exists. Safe to send to the browser — it is a boolean,
 * not the key — so the UI can explain WHY mainnet is unavailable instead of
 * just failing with a 401.
 */
export const isNetworkConfigured = (network: PredictNetwork): boolean =>
  network === "testnet" || Boolean(apiKeyFor("mainnet"));

export const NETWORK_LABEL: Record<PredictNetwork, string> = {
  testnet: "Testnet",
  mainnet: "Mainnet",
};

export const DEFAULT_NETWORK: PredictNetwork = "testnet";

export const parseNetwork = (value: string | undefined): PredictNetwork =>
  value === "mainnet" ? "mainnet" : "testnet";
