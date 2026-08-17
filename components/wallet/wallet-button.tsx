"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const BTN =
  "h-8 rounded-sm border border-border px-3 text-xs text-foreground transition-colors hover:bg-raised disabled:opacity-50";

function truncate(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/**
 * Wallet connect / status.
 *
 * Built on the useWallet + useWalletModal hooks rather than the adapter's stock
 * WalletMultiButton, whose default stylesheet renders a purple gradient button —
 * on the design system's forbidden list, and the most out-of-place element
 * imaginable in a dark trading terminal. We get the real connection flow with
 * our own styling.
 *
 * The balance shown is real devnet SOL. It is NOT the USDC collateral the
 * trading UI will use, so expect to show both once positions exist.
 */
export function WalletButton() {
  const { connection } = useConnection();
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  /**
   * The balance carries the address it belongs to, rather than being cleared on
   * disconnect. That makes staleness derivable: a balance fetched for a previous
   * wallet simply stops matching and renders as unknown. Clearing it in an
   * effect would both trip react-hooks/set-state-in-effect and leave a window
   * where wallet A's balance shows under wallet B's address.
   */
  const [balance, setBalance] = useState<{
    address: string;
    sol: number | null;
  } | null>(null);
  const [airdropState, setAirdropState] = useState<
    "idle" | "pending" | "failed"
  >("idle");

  /** Imperative refresh, for use from event handlers (e.g. after an airdrop). */
  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    const address = publicKey.toBase58();
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance({ address, sol: lamports / LAMPORTS_PER_SOL });
    } catch {
      // Public devnet RPC rate-limits aggressively. An unknown balance is
      // better than a wrong one, so render a dash rather than zero.
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

  const requestAirdrop = useCallback(async () => {
    if (!publicKey) return;
    setAirdropState("pending");
    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        LAMPORTS_PER_SOL,
      );
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature, ...latest });
      setAirdropState("idle");
      await refreshBalance();
    } catch {
      // The public faucet returns 429 much of the time. That is expected, not a
      // bug here — surface it plainly and point at the web faucet instead.
      setAirdropState("failed");
    }
  }, [connection, publicKey, refreshBalance]);

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
      {airdropState === "failed" && (
        <span className="hidden text-[11px] text-warn sm:inline">
          Faucet rate-limited —{" "}
          <a
            href="https://faucet.solana.com"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            use the web faucet
          </a>
        </span>
      )}

      <button
        type="button"
        onClick={() => void requestAirdrop()}
        disabled={airdropState === "pending"}
        className={BTN}
        title="Request 1 devnet SOL"
      >
        {airdropState === "pending" ? "Requesting…" : "Airdrop"}
      </button>

      <div className="flex h-8 items-center gap-2 rounded-sm border border-hairline px-3 text-xs">
        <span className="numeric text-muted">
          {shownSol === null ? "—" : shownSol.toFixed(3)} SOL
        </span>
        <span aria-hidden className="text-hairline">
          |
        </span>
        <span className="numeric text-foreground">
          {truncate(publicKey.toBase58())}
        </span>
      </div>

      <button
        type="button"
        onClick={() => void disconnect()}
        className={BTN}
      >
        Disconnect
      </button>
    </div>
  );
}
