"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";

import { useBalances } from "@/components/wallet/balances-provider";
import { USDC_SYMBOL } from "@/lib/wallet/usdc";
import {
  DEFAULT_CHAIN,
  FAUCET_URL,
  GAS_SYMBOL,
  SUPPORTED_CHAINS,
} from "@/lib/chain/config";

const BTN = "control h-9 px-3 text-xs";

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Wallet connect / status.
 *
 * Shows BOTH balances because they do different jobs: USDC is what you trade
 * with — collateral, position size, PnL and payouts are all denominated in it —
 * and BNB only ever pays transaction fees.
 *
 * Connectors come from EIP-6963 discovery, so each installed wallet announces
 * itself and we render one button per wallet. No stock modal is used: the
 * adapter-style modals ship their own stylesheets, which the design system
 * forbids.
 */
export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { usdc, gas } = useBalances();

  const [open, setOpen] = useState(false);
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

  if (!isConnected || !address) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={isPending}
          aria-expanded={open}
          className={BTN}
        >
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>

        {open && (
          <div className="panel absolute top-full right-0 z-30 mt-1 flex w-56 flex-col p-1">
            {connectors.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted">
                No browser wallet detected. Install MetaMask, Trust or Rabby.
              </p>
            ) : (
              connectors.map((connector) => (
                <button
                  key={connector.uid}
                  type="button"
                  onClick={() => {
                    connect({ connector, chainId: DEFAULT_CHAIN.id });
                    setOpen(false);
                  }}
                  className="rounded-sm px-3 py-2 text-left text-xs text-foreground hover:bg-hover"
                >
                  {connector.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // Connected to something we don't serve markets for. Offering the switch is
  // more useful than silently showing empty balances.
  const onSupportedChain = SUPPORTED_CHAINS.some((c) => c.id === chainId);
  if (!onSupportedChain) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: DEFAULT_CHAIN.id })}
        className={`${BTN} border-warn/50 text-warn`}
      >
        Switch to {DEFAULT_CHAIN.name}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={FAUCET_URL}
        target="_blank"
        rel="noreferrer"
        className={`${BTN} hidden leading-9 sm:inline-block`}
        title={`Open the BNB Chain faucet to fund ${GAS_SYMBOL} gas`}
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
          {gas === null ? "—" : gas.toFixed(3)}{" "}
          <span className="text-faint">{GAS_SYMBOL}</span>
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

      <button type="button" onClick={() => disconnect()} className={BTN}>
        Disconnect
      </button>
    </div>
  );
}
