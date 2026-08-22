import type { PrivyClientConfig } from "@privy-io/react-auth";

import { DEFAULT_CHAIN, SUPPORTED_CHAINS } from "@/lib/chain/config";

/**
 * Privy App ID.
 *
 * NEXT_PUBLIC_ by design — unlike the predict.fun API key, this one is meant to
 * be in the browser. It identifies the app to Privy; it authorises nothing on
 * its own. Get one at dashboard.privy.io.
 */
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() || "";

/** Optional. Only needed if you run several clients off one Privy app. */
export const PRIVY_CLIENT_ID =
  process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim() || undefined;

export const IS_PRIVY_CONFIGURED = PRIVY_APP_ID.length > 0;

/**
 * Privy client config.
 *
 * `theme` is passed in rather than hardcoded so the login modal matches the
 * app's current theme — a white modal over the dark terminal is exactly the
 * kind of thing the design system exists to prevent.
 *
 * `supportedChains` must match the chains in the wagmi config; Privy drives
 * wagmi's connector state, and a chain known to one and not the other produces
 * a wallet that connects but reports the wrong network.
 */
export function privyConfig(theme: "light" | "dark"): PrivyClientConfig {
  return {
    appearance: {
      theme,
      // Matches --accent. Privy only accepts a hex literal here, so this cannot
      // read the CSS variable and must be kept in step with globals.css.
      accentColor: theme === "dark" ? "#d9d3cf" : "#433f3b",
      // EVM only. Solana was removed from this app deliberately; leaving the
      // default would offer Phantom et al. in the modal and connect a wallet
      // this app cannot read a balance from.
      walletChainType: "ethereum-only",
      // Email/social first. Those users get an embedded wallet, which is what a
      // smart account is built on — and the smart account is what gets its gas
      // sponsored. Leading with "connect MetaMask" steers people into the one
      // path that cannot be sponsored.
      showWalletLoginFirst: false,
    },
    loginMethods: ["email", "google", "wallet"],
    embeddedWallets: {
      /*
       * `all-users`, NOT `users-without-wallets`.
       *
       * The narrower setting only provisions an embedded wallet for users with
       * no wallet at all — so anyone who has ever linked MetaMask silently
       * never gets one. No embedded wallet means no signer, which means Privy
       * never creates a smart account, which means no gas sponsorship. The
       * failure is invisible: login succeeds, a `wallet` account exists, and
       * `smart_wallet` simply never appears.
       *
       * With `all-users` everyone gets an embedded wallet, so everyone gets a
       * smart account. Trade-off: a user who connects an external wallet still
       * trades from the smart account rather than the address they connected.
       * That is correct for a sponsored app, but it does surprise people, so
       * the wallet button labels the smart account explicitly.
       */
      ethereum: { createOnLogin: "all-users" },
    },
    defaultChain: DEFAULT_CHAIN,
    supportedChains: [...SUPPORTED_CHAINS],
  };
}
