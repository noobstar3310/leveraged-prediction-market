"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

import { useBalances } from "@/components/wallet/balances-provider";
import { useSmartWallet } from "@/components/wallet/smart-wallet";
import { useWalletAvailability } from "@/components/wallet/availability";
import { collateralFor } from "@/lib/wallet/collateral";
import { PRIVY_APP_ID } from "@/lib/chain/privy";

/**
 * Wallet state, spelled out.
 *
 * Smart-account setup fails quietly — a missing dashboard chain, a session
 * predating the config change, or a wallet on the wrong network all present
 * identically as "no sponsorship", with nothing on screen to tell them apart.
 * This shows the handful of values that actually distinguish them.
 *
 * Collapsed by default: it is a setup aid, not part of the product.
 */
export function WalletDiagnostics() {
  const availability = useWalletAvailability();
  const { ready, authenticated, user } = usePrivy();
  const { address: eoa, chainId, isConnected } = useAccount();
  const { clientPresent, clientChainId, address: smart } = useSmartWallet();
  const { address: effective, isSmartAccount } = useBalances();

  const accounts = (user?.linkedAccounts ?? []) as {
    type: string;
    address?: string;
    walletClientType?: string;
    chainType?: string;
  }[];
  const linked = accounts.map((a) => a.type).join(", ");

  /*
   * The distinction that matters: Privy's own embedded wallet reports
   * walletClientType "privy", an external one reports "metamask" / "rabby" /
   * etc. Only an embedded wallet can back a smart account, and both show up as
   * type "wallet", so the type alone cannot tell you whether sponsorship is
   * even possible.
   */
  const walletDetail =
    accounts
      .filter((a) => a.type === "wallet")
      .map(
        (a) =>
          `${a.walletClientType ?? "?"}${a.chainType ? `/${a.chainType}` : ""} ${
            a.address ? a.address.slice(0, 6) + "…" + a.address.slice(-4) : ""
          }`,
      )
      .join(" | ") || "(no wallet accounts)";

  const hasEmbedded = accounts.some(
    (a) => a.type === "wallet" && a.walletClientType === "privy",
  );
  const smartLinked = (user?.linkedAccounts ?? []).find(
    (a) => a.type === "smart_wallet",
  ) as { address?: string } | undefined;

  const rows: [string, string][] = [
    ["privy availability", availability],
    ["privy ready", String(ready)],
    ["authenticated", String(authenticated)],
    ["linked account types", linked || "(none)"],
    ["wallet accounts", walletDetail],
    ["has embedded (privy) wallet", String(hasEmbedded)],
    ["app id in use", PRIVY_APP_ID || "(unset)"],
    ["smart_wallet in user", smartLinked?.address ?? "(absent)"],
    ["smart client present", String(clientPresent ?? false)],
    ["smart client chain", clientChainId != null ? String(clientChainId) : "(none)"],
    ["smart account address", smart ?? "(none)"],
    ["wagmi EOA", eoa ?? "(none)"],
    ["wagmi connected", String(isConnected)],
    ["wagmi chainId", chainId != null ? String(chainId) : "(none)"],
    ["effective address", effective ?? "(none)"],
    ["isSmartAccount", String(isSmartAccount)],
    ["collateral configured", collateralFor(chainId) ? collateralFor(chainId)!.symbol : "(no token for chain)"],
  ];

  return (
    <details className="mt-8">
      <summary className="cursor-pointer text-[11px] text-faint transition-colors hover:text-muted">
        Wallet diagnostics
      </summary>
      <dl className="numeric mt-3 grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)] gap-x-4 gap-y-1 text-[11px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-faint">{k}</dt>
            <dd className="break-all text-muted">{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
