"use client";

import { useTransition } from "react";

import { setNetwork } from "@/app/actions/network";
import type { PredictNetwork } from "@/lib/predict/config";

/**
 * Testnet / mainnet toggle for the DATA SOURCE.
 *
 * Deliberately distinct from the wallet's network badge beside it. They are two
 * different things and can legitimately disagree — you can browse mainnet
 * markets with a testnet wallet — so this control is labelled "data" and never
 * claims to say anything about the chain your wallet is on.
 *
 * A form posting to a Server Action rather than a fetch: the API key lives on
 * the server and must never reach the browser, so the switch has to be resolved
 * server-side. It also means this works with JavaScript disabled.
 *
 * No animation. This is a segmented control whose whole job is to be instant.
 */
export function NetworkSwitch({
  current,
  mainnetConfigured,
}: {
  current: PredictNetwork;
  /** False when no PREDICT_API_KEY is set — mainnet 401s on every route. */
  mainnetConfigured: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const choose = (network: PredictNetwork) => {
    if (network === current) return;
    const data = new FormData();
    data.set("network", network);
    startTransition(() => {
      void setNetwork(data);
    });
  };

  return (
    <div
      className="flex items-center gap-1 rounded-sm border border-hairline p-0.5"
      aria-busy={pending}
    >
      <span className="px-1.5 text-[10px] tracking-wider text-faint uppercase">
        Data
      </span>
      {(["testnet", "mainnet"] as const).map((network) => {
        const active = network === current;
        const unavailable = network === "mainnet" && !mainnetConfigured;
        return (
          <button
            key={network}
            type="button"
            onClick={() => choose(network)}
            disabled={pending}
            aria-pressed={active}
            title={
              unavailable
                ? "Needs a predict.fun API key — set PREDICT_API_KEY in .env.local"
                : `Read market data from ${network}`
            }
            className={
              active
                ? "rounded-sm bg-raised px-2 py-1 text-[11px] text-foreground"
                : unavailable
                  ? "rounded-sm px-2 py-1 text-[11px] text-faint"
                  : "rounded-sm px-2 py-1 text-[11px] text-muted transition-colors hover:text-foreground"
            }
          >
            {network === "testnet" ? "Test" : "Main"}
            {/* An asterisk, not a hidden disable: the option exists, it just
                needs a key. Silently greying it out invites the question this
                label answers. */}
            {unavailable && <span aria-hidden> *</span>}
          </button>
        );
      })}
    </div>
  );
}
