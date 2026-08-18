import { PublicKey, type Connection } from "@solana/web3.js";

import { SOLANA_CLUSTER } from "@/lib/solana/config";

/**
 * USDC — the settlement asset for every trade.
 *
 * Collateral, position size, PnL and payouts are all denominated in USDC. SOL is
 * only ever used to pay transaction fees; it is never traded.
 *
 * The mint differs per cluster, so it is resolved from the configured RPC rather
 * than hardcoded — pointing at mainnet with the devnet mint would silently
 * report a zero balance forever.
 *
 * Verified against devnet: the devnet mint below is owned by the Token program,
 * initialized, with 6 decimals.
 */
const MINTS: Record<string, string> = {
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

/** Null when the configured cluster has no known USDC mint (testnet, custom). */
export const USDC_MINT: PublicKey | null = MINTS[SOLANA_CLUSTER]
  ? new PublicKey(MINTS[SOLANA_CLUSTER])
  : null;

export const USDC_SYMBOL = "USDC";

/** Where to get devnet USDC. The SOL faucet does not hand this out. */
export const USDC_FAUCET_URL = "https://faucet.circle.com";

/**
 * The owner's USDC balance, summed across token accounts.
 *
 * A wallet can hold more than one account for the same mint, so summing is
 * correct where reading only the associated token account would under-report.
 * Returns 0 — not null — when no account exists, because "you hold none" is a
 * known fact, not an unknown one.
 */
export async function fetchUsdcBalance(
  connection: Connection,
  owner: PublicKey,
): Promise<number> {
  if (!USDC_MINT) return 0;
  const { value } = await connection.getParsedTokenAccountsByOwner(owner, {
    mint: USDC_MINT,
  });
  return value.reduce((sum, { account }) => {
    const parsed = account.data.parsed as
      | { info?: { tokenAmount?: { uiAmount?: number | null } } }
      | undefined;
    return sum + (parsed?.info?.tokenAmount?.uiAmount ?? 0);
  }, 0);
}
