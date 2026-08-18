"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { fetchUsdcBalance } from "@/lib/wallet/usdc";

type Balances = {
  /** USDC available to trade. Null while unknown (disconnected or RPC failed). */
  usdc: number | null;
  /** SOL, used only for transaction fees. */
  sol: number | null;
  refresh: () => void;
};

const BalancesContext = createContext<Balances>({
  usdc: null,
  sol: null,
  refresh: () => {},
});

export const useBalances = () => useContext(BalancesContext);

/**
 * Fetches both balances once, for everyone.
 *
 * The wallet button and the trade panel both need them, and the panel gates
 * opening a position on having enough USDC. Fetching in one place avoids two
 * components hitting a rate-limited public RPC with the same query.
 *
 * Balances are keyed to the address they were fetched for, so a stale response
 * for a previous wallet can never be shown against a new one.
 */
export function BalancesProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [state, setState] = useState<{
    address: string;
    usdc: number | null;
    sol: number | null;
  } | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!publicKey) return;
    const address = publicKey.toBase58();
    let cancelled = false;

    void (async () => {
      // Settled, not all: a rate-limited USDC lookup shouldn't blank the SOL
      // balance too. Each falls back to null independently.
      const [sol, usdc] = await Promise.allSettled([
        connection.getBalance(publicKey),
        fetchUsdcBalance(connection, publicKey),
      ]);
      if (cancelled) return;
      setState({
        address,
        sol: sol.status === "fulfilled" ? sol.value / LAMPORTS_PER_SOL : null,
        usdc: usdc.status === "fulfilled" ? usdc.value : null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey, nonce]);

  // Funding happens in another tab, so refresh when the user comes back.
  useEffect(() => {
    if (!publicKey) return;
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [publicKey, refresh]);

  const current = publicKey && state?.address === publicKey.toBase58() ? state : null;

  return (
    <BalancesContext.Provider
      value={{ usdc: current?.usdc ?? null, sol: current?.sol ?? null, refresh }}
    >
      {children}
    </BalancesContext.Provider>
  );
}
