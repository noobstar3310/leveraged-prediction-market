"use client";

import { Check, X } from "lucide-react";
import { toast } from "sonner";

import type { Side } from "@/lib/leverage";
import { formatPrice } from "@/lib/format";

/**
 * Order notifications.
 *
 * HEADLESS on purpose. Sonner's injected styles win the cascade, so matching a
 * design system through `classNames` means marking nearly every rule
 * `!important`. `toast.custom` keeps Sonner's positioning, stacking and swipe
 * while the markup is entirely ours — which is the library's own recommendation
 * once you have more than a couple of overrides.
 *
 * The toast is a `.panel`: raised structure, not a control. It carries no
 * cursor change and no pressed state, because the panel itself isn't pressable —
 * only the dismiss button inside it is.
 */

function usd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

/** 5s: long enough to read two lines, short enough not to linger. */
const DURATION = 5000;

type OrderToast = {
  side: Side;
  /** Effective leverage, after tiered margin. */
  leverage: number;
  notional: number;
  question: string;
  liquidationPrice: number;
};

export function notifyOrderPlaced(order: OrderToast) {
  toast.custom(
    (id) => <OrderPlaced {...order} onDismiss={() => toast.dismiss(id)} />,
    { duration: DURATION },
  );
}

function OrderPlaced({
  side,
  leverage,
  notional,
  question,
  liquidationPrice,
  onDismiss,
}: OrderToast & { onDismiss: () => void }) {
  const isYes = side === "yes";
  // Written out, not interpolated: Tailwind scans source text, so a
  // `text-${side}` template literal produces no class at all.
  const sideText = isYes ? "text-long" : "text-short";
  const sideRing = isYes ? "border-long/50" : "border-short/50";

  return (
    <div className="panel elev-2 flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 p-4">
      <span
        aria-hidden
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${sideRing} ${sideText}`}
      >
        <Check size={12} strokeWidth={3} />
      </span>

      <div className="min-w-0 flex-1">
        {/* The word "opened" carries the meaning; colour only reinforces it. */}
        <p className="text-sm font-medium text-foreground">
          Position opened ·{" "}
          <span className={sideText}>
            {side.toUpperCase()} {leverage.toFixed(leverage % 1 === 0 ? 0 : 2)}×
          </span>
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{question}</p>
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          <div className="flex gap-1.5">
            <dt className="text-faint">Size</dt>
            <dd className="numeric text-foreground">{usd(notional)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-faint">Liq.</dt>
            <dd className="numeric text-warn">
              {formatPrice(liquidationPrice)}
            </dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-sm p-1 text-faint transition-colors hover:text-foreground"
      >
        <X aria-hidden size={14} />
      </button>
    </div>
  );
}

export function notifyPositionClosed(question: string) {
  toast.custom(
    (id) => (
      <div className="panel elev-2 flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Position closed</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{question}</p>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          aria-label="Dismiss"
          className="shrink-0 rounded-sm p-1 text-faint transition-colors hover:text-foreground"
        >
          <X aria-hidden size={14} />
        </button>
      </div>
    ),
    { duration: DURATION },
  );
}
