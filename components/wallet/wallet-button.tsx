"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useSwitchChain } from "wagmi";

import { useBalances } from "@/components/wallet/balances-provider";
import {
  DEFAULT_CHAIN,
  FAUCET_URL,
  SUPPORTED_CHAINS,
} from "@/lib/chain/config";
import { faucetFor } from "@/lib/wallet/collateral";
import { useWalletAvailability } from "@/components/wallet/availability";

const BTN = "control h-9 px-3 text-xs";

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Wallet connect / status, backed by Privy.
 *
 * Privy owns the connection modal, so there is no hand-rolled connector list
 * here any more — it covers injected wallets, WalletConnect, email and social
 * login, and mints an embedded wallet for users who arrive without one.
 *
 * Balances still come from wagmi: Privy changes how a wallet connects, not how
 * the chain is read. Both balances are shown because they do different jobs —
 * the collateral token is what you trade with, BNB only ever pays fees. The
 * collateral ticker comes from the chain (USDT / TUSD), never hardcoded.
 */
export function WalletButton() {
  const availability = useWalletAvailability();
  const { ready, authenticated, login, logout } = usePrivy();
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const {
    // The effective account: smart wallet when there is one, EOA otherwise.
    // Showing the EOA here while balances read the smart account would have the
    // user copy an address their funds are not at.
    address,
    isSmartAccount,
    collateral,
    collateralSymbol,
    gas,
    gasSymbol,
  } = useBalances();

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked by permissions or a non-secure context. The
      // address is on screen either way, so failing quietly is acceptable.
    }
  }, [address]);

  // Says what is wrong instead of rendering a button that cannot work — and
  // distinguishes "no App ID set" from "the App ID present is rejected".
  if (availability !== "ready") {
    return (
      <span
        className="rounded-sm border border-warn/40 px-2.5 py-1.5 text-[11px] text-warn"
        title={
          availability === "unconfigured"
            ? "Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local — get one at dashboard.privy.io"
            : "Privy rejected this App ID. Check NEXT_PUBLIC_PRIVY_APP_ID against dashboard.privy.io."
        }
      >
        {availability === "unconfigured"
          ? "Wallet not configured"
          : "Wallet unavailable"}
      </span>
    );
  }

  // Privy resolves its session asynchronously. Rendering "Connect wallet" while
  // that is in flight makes an already-signed-in user look signed out, so the
  // button holds a fixed-width placeholder instead of flickering.
  if (!ready) {
    return (
      <span className={`${BTN} inline-block leading-9 text-faint`} aria-busy>
        Loading…
      </span>
    );
  }

  // A smart account is connected even when wagmi reports no EOA session, so
  // `address` — not `isConnected` — is what decides the connected state.
  if (!authenticated || !address) {
    return (
      <button type="button" onClick={() => login()} className={BTN}>
        Connect wallet
      </button>
    );
  }

  // Connected to a chain we serve no markets for. Offering the switch beats
  // silently showing empty balances.
  const onSupportedChain = SUPPORTED_CHAINS.some((c) => c.id === chainId);
  if (!onSupportedChain) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => switchChain({ chainId: DEFAULT_CHAIN.id })}
          className={`${BTN} border-warn/50 text-warn`}
        >
          Switch to {DEFAULT_CHAIN.name}
        </button>
        <button type="button" onClick={() => void logout()} className={BTN}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* On testnet this goes to our own page, which can actually mint the
          collateral token. On mainnet there is nothing to mint, so it stays a
          link out to the bridge. */}
      {faucetFor(chainId) ? (
        <Link href="/faucet" className={`${BTN} hidden leading-9 sm:inline-block`}>
          Fund
        </Link>
      ) : (
        <a
          href={FAUCET_URL}
          target="_blank"
          rel="noreferrer"
          className={`${BTN} hidden leading-9 sm:inline-block`}
          title="Bridge or buy the settlement token"
        >
          Fund
        </a>
      )}

      <button
        type="button"
        onClick={() => void copyAddress()}
        className="control flex h-9 items-center gap-2.5 px-3 text-xs"
        title={
          isSmartAccount
            ? "Smart account — gas sponsored. Click to copy."
            : "Copy address to clipboard"
        }
      >
        {/* Trading balance leads; gas is secondary. */}
        <span className="numeric text-foreground">
          {collateral === null ? "—" : collateral.toFixed(2)}{" "}
          <span className="text-faint">{collateralSymbol}</span>
        </span>
        <span aria-hidden className="text-rim">
          |
        </span>
        <span className="numeric text-muted" title="Used for gas only">
          {gas === null ? "—" : gas.toFixed(3)}{" "}
          <span className="text-faint">{gasSymbol}</span>
        </span>
        <span aria-hidden className="text-rim">
          |
        </span>
        {/* Fixed width: the truncated address is 11 monospace characters and
            "Copied" is 6, so without this the button resizes on click and shoves
            its neighbours. Interaction states must not shift layout. */}
        <span className="numeric inline-block min-w-[11ch] text-center text-foreground">
          {copied ? "Copied" : truncate(address)}
        </span>
      </button>

      <button type="button" onClick={() => void logout()} className={BTN}>
        Disconnect
      </button>
    </div>
  );
}
