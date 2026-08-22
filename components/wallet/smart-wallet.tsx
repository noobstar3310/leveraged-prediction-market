"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import type { Hash } from "viem";

type SendSponsored = (tx: {
  to: `0x${string}`;
  data: `0x${string}`;
  value?: bigint;
}) => Promise<Hash>;

type SmartWalletState = {
  /**
   * Whether Privy handed us a smart-account client at all. Distinct from
   * `address`: a client that exists but has no account still means something
   * different from no client, and telling them apart is the whole diagnosis
   * when sponsorship silently does not engage.
   */
  clientPresent?: boolean;
  /** Chain the smart-account client is bound to, when it has one. */
  clientChainId?: number;
  /**
   * The smart account address, when one exists.
   *
   * This is NOT the embedded EOA. The EOA only signs; the smart account is what
   * holds funds and is what the exchange will see as the trader. Anything that
   * reads a balance or receives tokens must use this address when it is
   * present, or the user will fund one account and trade from another.
   */
  address?: `0x${string}`;
  /** Present only when a paymaster is configured for the active chain. */
  sendSponsored?: SendSponsored;
};

const Ctx = createContext<SmartWalletState>({});

export const useSmartWallet = () => useContext(Ctx);

/**
 * Publishes Privy's smart-wallet state into our own context.
 *
 * A bridge rather than calling `useSmartWallets()` at each site, because that
 * hook only works beneath `SmartWalletsProvider` — and this app deliberately
 * renders a Privy-free tree when the App ID is missing or rejected. Consumers
 * read our context instead and get an empty object there, rather than throwing
 * and taking down pages that never needed a wallet.
 *
 * Must sit ABOVE BalancesProvider: balances are read for the smart account.
 */
export function SmartWalletBridge({ children }: { children: ReactNode }) {
  const { client } = useSmartWallets();

  const value = useMemo<SmartWalletState>(() => {
    if (!client) return { clientPresent: false };
    return {
      clientPresent: true,
      // `chain` is typed as never on this client shape; read it defensively
      // rather than fight the type — it is diagnostic output, not logic.
      clientChainId: (client as unknown as { chain?: { id?: number } }).chain?.id,
      address: client.account?.address,
      sendSponsored: (tx) =>
        // Gas is covered by the paymaster configured in the Privy dashboard for
        // this chain. With no paymaster the call still works — the smart
        // account just pays its own gas — so this is never a hard dependency.
        client.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value ?? 0n,
        } as Parameters<typeof client.sendTransaction>[0]),
    };
  }, [client]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Used in the Privy-free tree so consumers get a defined, empty state. */
export function NoSmartWallet({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={{}}>{children}</Ctx.Provider>;
}
