"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import { BalancesProvider } from "@/components/wallet/balances-provider";
import { wagmiConfig } from "@/lib/chain/wagmi";

/**
 * BNB Chain wallet context.
 *
 * wagmi needs a react-query client; it is created in state rather than at
 * module scope so a single client is never shared across two server requests.
 */
export function ChainProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BalancesProvider>{children}</BalancesProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
