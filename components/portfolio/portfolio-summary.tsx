"use client";

import type { Market } from "@/lib/data/clients";
import {
  healthFactor,
  liquidationPrice,
  notionalFor,
  unrealizedPnl,
  type Position,
} from "@/lib/leverage";
import { usePositions } from "@/lib/positions/store";
import { useBalances } from "@/components/wallet/balances-provider";
import { USDC_SYMBOL } from "@/lib/wallet/usdc";
import { formatPrice } from "@/lib/format";

function usd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

/**
 * Portfolio summary.
 *
 * Every figure is derived from open positions and the connected wallet — there
 * is deliberately no 14-day volume, fee schedule, max drawdown or PnL chart,
 * because no position history is recorded. An empty axis or an invented series
 * would be worse than their absence.
 *
 * The one number here that a leveraged product owes its user, and that most
 * portfolio screens bury, is how close the worst position is to liquidation.
 * It gets its own tile.
 */
export function PortfolioSummary({ markets }: { markets: Market[] }) {
  const stored = usePositions();
  const { usdc, sol } = useBalances();

  const priceFor = (marketId: string) =>
    markets.find((m) => m.id === marketId)?.yesPrice ?? null;

  let marginAtRisk = 0;
  let positionSize = 0;
  let totalPnl = 0;
  let pricedCount = 0;
  let worst: { health: number; liq: number; question: string } | null = null;

  for (const s of stored) {
    const position: Position = {
      side: s.side,
      margin: s.margin,
      leverage: s.leverage,
      entryPrice: s.entryPrice,
    };
    marginAtRisk += s.margin;
    positionSize += notionalFor(s.margin, s.leverage);

    const mark = priceFor(s.marketId);
    if (mark === null) continue;
    pricedCount++;
    totalPnl += unrealizedPnl(position, mark);

    const health = healthFactor(position, mark);
    if (!worst || health < worst.health) {
      worst = {
        health,
        liq: liquidationPrice(position),
        question: s.marketQuestion,
      };
    }
  }

  const positionEquity = marginAtRisk + totalPnl;
  const up = totalPnl >= 0;
  // Unpriced positions would silently understate the total, so say so rather
  // than presenting a partial sum as complete.
  const partial = stored.length > 0 && pricedCount < stored.length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section aria-label="Balances" className="panel flex flex-col gap-3 p-4">
        <h2 className="text-[10px] tracking-wide text-faint uppercase">
          Wallet
        </h2>
        <Figure
          label={`Available to trade`}
          value={usdc === null ? "—" : `${usd(usdc)}`}
          hint={USDC_SYMBOL}
          large
        />
        <div className="border-t border-hairline pt-3">
          <Row
            label="Gas balance"
            value={sol === null ? "—" : `${sol.toFixed(3)} SOL`}
          />
        </div>
      </section>

      <section aria-label="Exposure" className="panel flex flex-col gap-3 p-4">
        <h2 className="text-[10px] tracking-wide text-faint uppercase">
          Open exposure
        </h2>
        <Figure
          label="Unrealized PnL"
          // Colour is reinforcement only — the arrow and sign carry it.
          value={`${up ? "▲ +" : "▼ −"}${usd(Math.abs(totalPnl)).replace("$", "$")}`}
          tone={up ? "long" : "short"}
          large
        />
        <div className="flex flex-col gap-2 border-t border-hairline pt-3">
          <Row label="Open positions" value={String(stored.length)} />
          <Row label="Margin at risk" value={usd(marginAtRisk)} />
          <Row label="Position size" value={usd(positionSize)} />
          <Row label="Position equity" value={usd(positionEquity)} />
        </div>
        {partial && (
          <p className="text-[10px] text-warn">
            {stored.length - pricedCount} position
            {stored.length - pricedCount === 1 ? "" : "s"} could not be priced and
            are excluded from PnL.
          </p>
        )}
      </section>

      <section aria-label="Risk" className="panel flex flex-col gap-3 p-4">
        <h2 className="text-[10px] tracking-wide text-faint uppercase">
          Liquidation risk
        </h2>
        {worst ? (
          <>
            <Figure
              label="Lowest health"
              value={`${Math.round(worst.health * 100)}%`}
              tone={worst.health > 0.5 ? "long" : "warn"}
              large
            />
            <div
              aria-hidden
              className="h-1.5 w-full overflow-hidden rounded-sm bg-well"
            >
              <div
                className={
                  worst.health > 0.5 ? "h-full bg-long" : "h-full bg-warn"
                }
                style={{ width: `${worst.health * 100}%` }}
              />
            </div>
            <div className="flex flex-col gap-2 border-t border-hairline pt-3">
              <Row label="Liquidates at" value={formatPrice(worst.liq)} tone="warn" />
              <p className="line-clamp-2 text-[11px] text-muted">
                {worst.question}
              </p>
            </div>
          </>
        ) : (
          <>
            <Figure label="Lowest health" value="—" large />
            <p className="text-xs text-muted">
              No open positions, so nothing can be liquidated.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function Figure({
  label,
  value,
  hint,
  tone,
  large,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "long" | "short" | "warn";
  large?: boolean;
}) {
  const toneClass =
    tone === "long"
      ? "text-long"
      : tone === "short"
        ? "text-short"
        : tone === "warn"
          ? "text-warn"
          : "text-foreground";
  return (
    <div>
      <p className="text-[11px] text-faint">{label}</p>
      <p
        className={`numeric mt-1 ${large ? "text-2xl" : "text-sm"} leading-none ${toneClass}`}
      >
        {value}
        {hint && <span className="ml-1.5 text-xs text-faint">{hint}</span>}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-faint">{label}</span>
      <span className={`numeric ${tone === "warn" ? "text-warn" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
