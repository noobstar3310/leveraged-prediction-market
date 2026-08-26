/**
 * The settlement asset — chain-aware, because predict.fun's collateral is not
 * the same token on every network.
 *
 * Collateral, position size, PnL and payouts are all denominated in it. The gas
 * token (BNB) is never collateral.
 *
 * These are the addresses predict.fun's own SDK (`@predictdotfun/sdk`) uses as
 * exchange collateral, and every field below was read back on-chain rather than
 * trusted: symbol via `symbol()`, decimals via `decimals()`. That matters twice
 * over — the symbol DIFFERS by chain, so no screen may hardcode one, and both
 * tokens are 18 decimals, unlike the 6 that USDC uses on Ethereum and Solana.
 *
 * We previously read a USDC contract here. That was wrong: predict.fun would
 * never accept it, so the trade panel was gating on a balance the venue does
 * not settle in.
 */
import { bsc, bscTestnet } from "wagmi/chains";

export type CollateralToken = {
  address: `0x${string}`;
  /** As reported by the contract, e.g. "USDT" on mainnet, "TUSD" on testnet. */
  symbol: string;
  decimals: number;
};

export const COLLATERAL_BY_CHAIN: Record<number, CollateralToken> = {
  // Tether USD — the canonical BSC USDT.
  [bsc.id]: {
    address: "0x55d398326f99059fF775485246999027B3197955",
    symbol: "USDT",
    decimals: 18,
  },
  // TrueUSD on BNB testnet. The SDK calls this slot "USDT"; the contract itself
  // reports TUSD, and the contract wins.
  [bscTestnet.id]: {
    address: "0xB32171ecD878607FFc4F8FC0bCcE6852BB3149E0",
    symbol: "TUSD",
    decimals: 18,
  },
};

export const collateralFor = (
  chainId: number | undefined,
): CollateralToken | undefined =>
  chainId === undefined ? undefined : COLLATERAL_BY_CHAIN[chainId];

/**
 * Symbol for display when no wallet is connected yet.
 *
 * Falls back to the default chain's token rather than a hardcoded string, so
 * pointing the app at mainnet relabels the UI without a code change.
 */
export const DEFAULT_COLLATERAL_SYMBOL =
  COLLATERAL_BY_CHAIN[bscTestnet.id].symbol;

/** Minimal BEP-20 surface — balanceOf is all we read. */
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * Where a user obtains collateral.
 *
 * On testnet the BNB Chain faucet is the sanctioned source; it issues gas plus
 * a small set of test tokens, and is not a dedicated tap for this one — which
 * the link text must not imply.
 */
export const COLLATERAL_FAUCET_URL =
  "https://www.bnbchain.org/en/testnet-faucet";

/**
 * Self-mint faucet, testnet only.
 *
 * The testnet collateral token exposes `allocateTo(address,uint256)` — the
 * standard testnet-mock faucet — and it is permissionless: simulating it from
 * an unrelated address succeeds and estimates ~51k gas, which a permissioned
 * mint would not.
 *
 * Mainnet USDT has no such function and never will, so this map is the single
 * place that decides whether a faucet is offered at all.
 */
export const FAUCET_ABI = [
  {
    type: "function",
    name: "allocateTo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

/** Tokens whose contract carries `allocateTo`. Keyed by chain id. */
const FAUCET_CHAINS = new Set<number>([bscTestnet.id]);

export const faucetFor = (
  chainId: number | undefined,
): CollateralToken | undefined =>
  chainId !== undefined && FAUCET_CHAINS.has(chainId)
    ? COLLATERAL_BY_CHAIN[chainId]
    : undefined;

/** What one click hands out. Whole tokens; scaled by decimals at call time. */
export const FAUCET_AMOUNT = 1000;

/** Gas cannot be minted — it still comes from the official faucet. */
export const GAS_FAUCET_URL = "https://www.bnbchain.org/en/testnet-faucet";

/**
 * Client-safe copy of the drip amount.
 *
 * The server module that actually sends it imports `server-only`, so a client
 * component cannot read the value from there without failing the build. This
 * is display text; the amount the server sends is decided server-side and is
 * never taken from the client.
 */
export const GAS_DRIP_BNB = "0.01";

/** Client-safe copy of the drip cooldown, for UI copy only. Enforced server-side. */
export const GAS_DRIP_COOLDOWN_HOURS = 48;
