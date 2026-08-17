import { clusterApiUrl } from "@solana/web3.js";

/**
 * Which Solana network the app is talking to.
 *
 * "custom" means we could not tell from the endpoint. That is reported honestly
 * rather than assumed to be devnet — a UI that claims "Devnet" while pointed at
 * mainnet is how someone loses real money.
 */
export type SolanaCluster = "devnet" | "testnet" | "mainnet" | "custom";

/**
 * Resolve the RPC endpoint.
 *
 * The public endpoint (api.devnet.solana.com) works, but rate-limits per IP, so
 * balance lookups get throttled and intermittently return unknown. Point
 * NEXT_PUBLIC_SOLANA_RPC_URL at a provider key (Helius, QuickNode, Alchemy) for
 * per-key limits instead.
 *
 * This has no bearing on funding — there is no in-app airdrop. See
 * components/wallet/wallet-button.tsx for why.
 *
 * NOTE: this value is NEXT_PUBLIC_, so it ships to the browser. That is
 * unavoidable for a client-side RPC connection — use a key restricted to your
 * domain, never an unrestricted one.
 */
function resolveEndpoint(): string {
  const raw = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim();
  if (!raw) return clusterApiUrl("devnet");

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
    return raw;
  } catch {
    console.warn(
      "[solana] NEXT_PUBLIC_SOLANA_RPC_URL is not a valid http(s) URL — falling back to the public devnet endpoint.",
    );
    return clusterApiUrl("devnet");
  }
}

/**
 * Infer the network from the endpoint so the UI label can never contradict what
 * we are actually connected to. Provider URLs reliably name the cluster:
 * devnet.helius-rpc.com, xxx.solana-devnet.quiknode.pro, api.devnet.solana.com.
 * Anything unrecognised reports "custom" rather than guessing.
 */
function resolveCluster(endpoint: string): SolanaCluster {
  const value = endpoint.toLowerCase();
  if (value.includes("devnet")) return "devnet";
  if (value.includes("testnet")) return "testnet";
  if (value.includes("mainnet")) return "mainnet";
  return "custom";
}

export const SOLANA_RPC_URL = resolveEndpoint();
export const SOLANA_CLUSTER: SolanaCluster = resolveCluster(SOLANA_RPC_URL);

/** True when a stray config change has pointed a mock-data app at real money. */
export const IS_MAINNET = SOLANA_CLUSTER === "mainnet";

export const CLUSTER_LABEL: Record<SolanaCluster, string> = {
  devnet: "Devnet",
  testnet: "Testnet",
  mainnet: "Mainnet",
  custom: "Custom RPC",
};
