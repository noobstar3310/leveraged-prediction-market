import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { bsc, bscTestnet } from "wagmi/chains";

/**
 * wagmi config.
 *
 * `injected()` alone covers MetaMask, Trust, Rabby, OKX, Binance Wallet and
 * every other EIP-1193 browser wallet: wagmi discovers them through EIP-6963,
 * so each installed wallet is announced individually rather than fighting over
 * a single `window.ethereum`. That is the EVM equivalent of Solana's Wallet
 * Standard auto-detection, and it needs no per-wallet adapter list.
 *
 * No WalletConnect: it requires a project id from a third-party dashboard, and
 * nothing here needs mobile deep-linking yet.
 *
 * Built once at module scope — wagmi requires a stable config object, and
 * rebuilding it per render drops the connection on every navigation.
 */
export const wagmiConfig = createConfig({
  chains: [bscTestnet, bsc],
  connectors: [injected()],
  // SSR-safe persistence: without cookie storage the app renders "disconnected"
  // on the server and flips after hydration, which flashes the connect button.
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
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
