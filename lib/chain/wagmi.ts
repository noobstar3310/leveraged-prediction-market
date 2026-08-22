import { http } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { bsc, bscTestnet } from "wagmi/chains";

/**
 * wagmi config, built for Privy.
 *
 * `createConfig` comes from `@privy-io/wagmi`, NOT from `wagmi` — it is a
 * drop-in replacement that lets Privy drive wagmi's connector state so the two
 * stay in sync. Importing the wagmi one instead compiles fine and then silently
 * leaves wagmi unaware of whichever wallet Privy connected.
 *
 * No `connectors` array: Privy owns connection now. It handles injected
 * wallets, WalletConnect and its own embedded wallet, so listing connectors
 * here would duplicate that and fight over the active account.
 *
 * Chains must match `supportedChains` in the Privy config.
 *
 * Built once at module scope — wagmi requires a stable config object, and
 * rebuilding it per render drops the connection on every navigation.
 */
export const wagmiConfig = createConfig({
  chains: [bscTestnet, bsc],
  transports: {
    [bscTestnet.id]: http(),
    [bsc.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
