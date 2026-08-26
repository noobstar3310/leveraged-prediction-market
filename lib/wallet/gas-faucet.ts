import "server-only";

import { bscTestnet } from "wagmi/chains";

/**
 * Server-side BNB drip.
 *
 * A funded testnet account that sends a fixed amount of gas to whoever asks, so
 * a new user can transact without first owning BNB. This exists because the
 * official BNB faucet requires holding mainnet BNB, which is exactly what a
 * brand-new embedded-wallet user does not have.
 *
 * SECURITY — the whole file hinges on these:
 *
 * - `FAUCET_PRIVATE_KEY` is deliberately NOT `NEXT_PUBLIC_`. It must never be
 *   bundled into client code. This module imports `server-only`, so any
 *   accidental client import fails the build rather than shipping a key.
 * - Testnet only, enforced by chain id below. The same key on mainnet would be
 *   a hot wallet handing money to strangers.
 * - Fixed amount, never caller-specified. A drip that takes an amount from the
 *   request is a drain waiting to happen.
 */
export const GAS_FAUCET_CHAIN = bscTestnet;

/** Whole BNB per request. Enough for many transactions at 0.1 gwei. */
export const GAS_DRIP_BNB = "0.01";

/** How long an address must wait between drips. */
export const GAS_DRIP_COOLDOWN_HOURS = 48;
export const GAS_DRIP_COOLDOWN_MS = GAS_DRIP_COOLDOWN_HOURS * 60 * 60 * 1000;

export const faucetPrivateKey = (): `0x${string}` | undefined => {
  const raw = process.env.FAUCET_PRIVATE_KEY?.trim();
  if (!raw) return undefined;
  const key = raw.startsWith("0x") ? raw : `0x${raw}`;
  // A malformed key would otherwise surface as an opaque viem error at send
  // time, long after the real mistake.
  return /^0x[0-9a-fA-F]{64}$/.test(key) ? (key as `0x${string}`) : undefined;
};

export const IS_GAS_FAUCET_CONFIGURED = Boolean(faucetPrivateKey());

/**
 * Per-address cooldown.
 *
 * In-memory and parked on globalThis, for the same reason as the catalogue
 * cache: Next bundles route handlers separately, and a module-level Map would
 * give each bundle its own — halving the effective cooldown. Resets on restart,
 * which is acceptable for a testnet drip; a real deployment wants a store.
 */
const g = globalThis as unknown as { __gasDripLog?: Map<string, number> };
export const dripLog: Map<string, number> =
  g.__gasDripLog instanceof Map
    ? g.__gasDripLog
    : (g.__gasDripLog = new Map<string, number>());
