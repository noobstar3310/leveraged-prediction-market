"use client";

import { useMemo, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase";
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { clusterApiUrl } from "@solana/web3.js";

// Required for the wallet-selection modal's layout. Its colours are overridden
// in app/globals.css — the stock styling is a light panel with a purple gradient
// button, which the design system forbids.
import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * Solana connection + wallet context.
 *
 * Devnet, via the public RPC endpoint. That endpoint is rate-limited and fine
 * for development; a real deployment wants a dedicated RPC provider.
 *
 * These adapters are listed so users WITHOUT a wallet still see options.
 *
 * Wallet Standard auto-detection alone only surfaces wallets already installed
 * in the browser, so a visitor with nothing installed — or with only MetaMask —
 * sees a near-empty picker and no route forward. Naming these makes the modal
 * show them under "More options" with links to install.
 *
 * Listing one that IS installed is harmless: useStandardWalletAdapters filters
 * out any adapter whose name matches an auto-registered Standard Wallet, so
 * nothing appears twice. It logs a console warning when that happens, which is
 * expected and not worth silencing.
 */
export function SolanaProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);

  // Constructed in useMemo rather than at module scope: "use client" modules are
  // still evaluated on the server during SSR, and adapter constructors can touch
  // browser globals. useMemo defers them to the client and builds them once.
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
