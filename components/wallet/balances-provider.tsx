"use client";

import { createContext, useContext, type ReactNode } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";

import { ERC20_ABI, usdcFor } from "@/lib/wallet/usdc";

type Balances = {
  /** USDC available to trade. Null while unknown (disconnected or RPC failed). */
  usdc: number | null;
  /** BNB, used only for transaction fees. */
  gas: number | null;
  refresh: () => void;
};

const BalancesContext = createContext<Balances>({
  usdc: null,
  gas: null,
  refresh: () => {},
});

export const useBalances = () => useContext(BalancesContext);

/**
 * Fetches both balances once, for everyone.
 *
 * The wallet button and the trade panel both need them, and the panel gates
 * opening a position on having enough USDC. Fetching in one place avoids two
 * components issuing the same RPC call.
 *
 * wagmi keys its queries by address AND chain, so a stale response for a
 * previous wallet can never be rendered against a new one — which is what the
 * hand-rolled address-keyed state used to guard against.
 */
export function BalancesProvider({ children }: { children: ReactNode }) {
  const { address, chainId, isConnected } = useAccount();
  const token = usdcFor(chainId);

  const gas = useBalance({
    address,
    query: { enabled: isConnected && Boolean(address) },
  });

  const usdc = useReadContract({
    abi: ERC20_ABI,
    address: token?.address,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && Boolean(address) && Boolean(token) },
  });

  const refresh = () => {
    void gas.refetch();
    void usdc.refetch();
  };

  return (
    <BalancesContext.Provider
      value={{
        usdc:
          usdc.data !== undefined && token
            ? Number(formatUnits(usdc.data as bigint, token.decimals))
            : null,
        gas: gas.data ? Number(formatUnits(gas.data.value, gas.data.decimals)) : null,
        refresh,
      }}
    >
      {children}
    </BalancesContext.Provider>
  );
}
