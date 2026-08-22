"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "@privy-io/wagmi";
import { WagmiProvider as BareWagmiProvider } from "wagmi";

import { BalancesProvider } from "@/components/wallet/balances-provider";
import { PrivyBoundary } from "@/components/wallet/privy-boundary";
import { WalletAvailabilityProvider } from "@/components/wallet/availability";
import {
  NoSmartWallet,
  SmartWalletBridge,
} from "@/components/wallet/smart-wallet";
import { useTheme } from "@/components/ui/theme";
import { wagmiConfig } from "@/lib/chain/wagmi";
import {
  IS_PRIVY_CONFIGURED,
  PRIVY_APP_ID,
  PRIVY_CLIENT_ID,
  privyConfig,
} from "@/lib/chain/privy";

/**
 * Wallet context: Privy for auth and connection, wagmi for chain reads.
 *
 * Nesting order is prescribed by Privy and is not interchangeable:
 * PrivyProvider > QueryClientProvider > WagmiProvider. `WagmiProvider` is
 * Privy's, not wagmi's — it pins `reconnectOnMount: false`, which the embedded
 * wallet requires.
 *
 * Everything downstream still uses ordinary wagmi hooks (`useAccount`,
 * `useBalance`, `useReadContract`). Privy replaces how a wallet is CONNECTED,
 * not how the chain is read.
 */
/** Never fires: hydration is a one-way transition, so there is nothing to watch. */
const subscribeNever = () => () => {};

export function ChainProvider({ children }: { children: ReactNode }) {
  // One client per mount, never module scope — a shared client would leak
  // cache between two server requests.
  const [queryClient] = useState(() => new QueryClient());
  const { theme } = useTheme();

  /*
   * Privy mounts on the client only.
   *
   * PrivyProvider throws on a bad App ID, and during SSR that throw is not
   * recoverable — Next reports it as a client_error and turns every route into
   * a 500, markets and docs included. An error boundary does not help there;
   * verified. Deferring the provider to after hydration keeps the server render
   * free of it entirely, and the boundary below then catches the same failure
   * on the client where it IS recoverable.
   *
   * Costs one extra render of the signed-out tree. `ready` was already false on
   * first paint, so the wallet button looks no different.
   */
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true, // client
    () => false, // server
  );

  const [privyFailed, setPrivyFailed] = useState(false);

  // Rebuilt only when the theme flips, so toggling light/dark restyles the
  // login modal without tearing down the Privy session on every render.
  const config = useMemo(() => privyConfig(theme), [theme]);

  /*
   * Without an App ID, PrivyProvider throws and takes the whole app down.
   *
   * Rendering the tree without it is the better failure: markets, charts and
   * the portfolio are all read-only and work perfectly well signed out. The
   * wallet button explains what is missing instead of the page going blank.
   */
  // wagmi's own provider still goes up in this path, because the balance hooks
  // call useConfig and would throw outside one. The config carries no
  // connectors, so everything reports a clean disconnected state.
  const signedOutTree = (
    <QueryClientProvider client={queryClient}>
      <BareWagmiProvider config={wagmiConfig}>
        <NoSmartWallet>
          <BalancesProvider>{children}</BalancesProvider>
        </NoSmartWallet>
      </BareWagmiProvider>
    </QueryClientProvider>
  );

  if (!IS_PRIVY_CONFIGURED) {
    return (
      <WalletAvailabilityProvider value="unconfigured">
        {signedOutTree}
      </WalletAvailabilityProvider>
    );
  }

  if (privyFailed) {
    return (
      <WalletAvailabilityProvider value="failed">
        {signedOutTree}
      </WalletAvailabilityProvider>
    );
  }

  // Pre-hydration: report "ready" so the button renders its normal loading
  // state rather than an error it has no basis for yet.
  if (!mounted) {
    return (
      <WalletAvailabilityProvider value="ready">
        {signedOutTree}
      </WalletAvailabilityProvider>
    );
  }

  return (
    <WalletAvailabilityProvider value="ready">
    <PrivyBoundary fallback={signedOutTree} onFail={() => setPrivyFailed(true)}>
      <PrivyProvider appId={PRIVY_APP_ID} clientId={PRIVY_CLIENT_ID} config={config}>
        {/* Smart wallets sit directly under Privy and above everything that
            reads an address: with a smart account in play, funds live there
            rather than at the embedded EOA. */}
        <SmartWalletsProvider>
          <QueryClientProvider client={queryClient}>
            <WagmiProvider config={wagmiConfig}>
              <SmartWalletBridge>
                <BalancesProvider>{children}</BalancesProvider>
              </SmartWalletBridge>
            </WagmiProvider>
          </QueryClientProvider>
        </SmartWalletsProvider>
      </PrivyProvider>
    </PrivyBoundary>
    </WalletAvailabilityProvider>
  );
}
