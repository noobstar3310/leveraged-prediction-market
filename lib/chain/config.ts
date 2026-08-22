import { bsc, bscTestnet } from "wagmi/chains";

/**
 * Which BNB Chain network the app talks to.
 *
 * predict.fun's market data comes from its testnet, so the wallet defaults to
 * BNB Smart Chain Testnet — a UI that says "Testnet" while a wallet is pointed
 * at mainnet is how someone loses real money, so the badge is always derived
 * from the chain actually in use, never hardcoded.
 */
export const SUPPORTED_CHAINS = [bscTestnet, bsc] as const;

/** Set NEXT_PUBLIC_CHAIN_ID=56 to run against BNB mainnet. */
const configuredId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
export const DEFAULT_CHAIN =
  configuredId === bsc.id ? bsc : bscTestnet;

export const IS_MAINNET = DEFAULT_CHAIN.id === bsc.id;

export const CHAIN_LABEL: Record<number, string> = {
  [bsc.id]: "BNB Mainnet",
  [bscTestnet.id]: "BNB Testnet",
};

export const chainLabel = (id: number | undefined): string =>
  id === undefined ? "No network" : (CHAIN_LABEL[id] ?? `Chain ${id}`);

/** Where a user tops up gas. BNB pays fees here, exactly as SOL did on Solana. */
export const GAS_SYMBOL = "BNB";
export const FAUCET_URL = IS_MAINNET
  ? "https://www.bnbchain.org/en/bnb-chain-bridge"
  : "https://www.bnbchain.org/en/testnet-faucet";
