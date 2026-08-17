"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const SOLANA_FAUCET_URL = "https://faucet.solana.com";

const BTN = "control h-9 px-3 text-xs";

function truncate(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/**
 * Wallet connect / status.
 *
 * Built on the useWallet + useWalletModal hooks rather than the adapter's stock
 * WalletMultiButton, whose default stylesheet renders a purple gradient button —
 * on the design system's forbidden list.
 *
 * There is deliberately NO in-app airdrop button. connection.requestAirdrop
 * against the public devnet endpoint returns 429 essentially always ("You've
 * either reached your airdrop limit today or the airdrop faucet has run dry"),
 * and a control that fails most of the time is worse than no control. Users are
 * sent to the official faucet instead.
 *
 * The faucet does NOT accept an address query parameter — passing ?address= only
 * lands in its router payload, never in the input — so we offer copy-to-clipboard
 * rather than pretending to prefill it.
 *
 * The balance shown is real SOL on whatever cluster the RPC points at. It is NOT
 * the collateral the trading UI will use.
 */
export function WalletButton() {
  const { connection } = useConnection();
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  /**
   * The balance carries the address it belongs to, rather than being cleared on
   * disconnect. That makes staleness derivable: a balance fetched for a previous
   * wallet simply stops matching and renders as unknown.
   */
  const [balance, setBalance] = useState<{
    address: string;
    sol: number | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    const address = publicKey.toBase58();
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance({ address, sol: lamports / LAMPORTS_PER_SOL });
    } catch {
      // Public RPC rate-limits aggressively. An unknown balance is better than a
      // wrong one, so render a dash rather than zero.
      setBalance({ address, sol: null });
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (!publicKey) return;
    const address = publicKey.toBase58();
    // `cancelled` matters beyond lint: switching wallets fires this again, and
    // without it a slow response for the previous key could land after the new
    // one.
    let cancelled = false;
    void (async () => {
      try {
        const lamports = await connection.getBalance(publicKey);
        if (!cancelled) {
          setBalance({ address, sol: lamports / LAMPORTS_PER_SOL });
        }
      } catch {
        if (!cancelled) setBalance({ address, sol: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

  // Funding happens in another tab, so refresh when the user comes back. This is
  // what replaces the airdrop button's "and now the balance updates" moment.
  useEffect(() => {
    if (!publicKey) return;
    const onFocus = () => void refreshBalance();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [publicKey, refreshBalance]);

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

  // Only trust a balance that was fetched for the wallet currently connected.
  const shownSol =
    balance && balance.address === publicKey.toBase58() ? balance.sol : null;

  return (
    <div className="flex items-center gap-2">
      <a
        href={SOLANA_FAUCET_URL}
        target="_blank"
        rel="noreferrer"
        className={`${BTN} leading-9`}
        title="Open the official Solana faucet to fund this wallet"
      >
        Fund wallet
      </a>

      <button
        type="button"
        onClick={() => void copyAddress()}
        className="control flex h-9 items-center gap-2 px-3 text-xs"
        title="Copy address to clipboard"
      >
        <span className="numeric text-muted">
          {shownSol === null ? "—" : shownSol.toFixed(3)} SOL
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
