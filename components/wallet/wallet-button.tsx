"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import { useBalances } from "@/components/wallet/balances-provider";
import { USDC_SYMBOL } from "@/lib/wallet/usdc";

const SOL_FAUCET_URL = "https://faucet.solana.com";

const BTN = "control h-9 px-3 text-xs";

function truncate(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/**
 * Wallet connect / status.
 *
 * Shows BOTH balances because they do different jobs: USDC is what you trade
 * with — collateral, position size, PnL and payouts are all denominated in it —
 * and SOL only ever pays transaction fees. Showing SOL alone implied it was the
 * trading asset.
 *
 * Built on the useWallet + useWalletModal hooks rather than the adapter's stock
 * WalletMultiButton, whose default stylesheet renders a purple gradient button —
 * on the design system's forbidden list.
 */
export function WalletButton() {
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { usdc, sol } = useBalances();

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const copyAddress = useCallback(async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked by permissions or a non-secure context. The
      // address is on screen either way, so failing quietly is acceptable.
    }
  }, [publicKey]);

  if (!connected || !publicKey) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        disabled={connecting}
        className={BTN}
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={SOL_FAUCET_URL}
        target="_blank"
        rel="noreferrer"
        className={`${BTN} hidden leading-9 sm:inline-block`}
        title="Open the Solana faucet to fund gas"
      >
        Fund
      </a>

      <button
        type="button"
        onClick={() => void copyAddress()}
        className="control flex h-9 items-center gap-2.5 px-3 text-xs"
        title="Copy address to clipboard"
      >
        {/* Trading balance leads; gas is secondary. */}
        <span className="numeric text-foreground">
          {usdc === null ? "—" : usdc.toFixed(2)}{" "}
          <span className="text-faint">{USDC_SYMBOL}</span>
        </span>
        <span aria-hidden className="text-rim">
          |
        </span>
        <span className="numeric text-muted" title="Used for gas only">
          {sol === null ? "—" : sol.toFixed(3)}{" "}
          <span className="text-faint">SOL</span>
        </span>
        <span aria-hidden className="text-rim">
          |
        </span>
        {/* Fixed width: the truncated address is 9 monospace characters and
            "Copied" is 6, so without this the button resizes on click and shoves
            its neighbours. Interaction states must not shift layout. */}
        <span className="numeric inline-block min-w-[9ch] text-center text-foreground">
          {copied ? "Copied" : truncate(publicKey.toBase58())}
        </span>
      </button>

      <button type="button" onClick={() => void disconnect()} className={BTN}>
        Disconnect
      </button>
    </div>
  );
}
