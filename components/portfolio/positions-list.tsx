"use client";

import Link from "next/link";

import type { Market } from "@/lib/data/clients";
import {
  healthFactor,
  liquidationPrice,
  notionalFor,
  unrealizedPnl,
  type Position,
} from "@/lib/leverage";
import { closePosition, usePositions } from "@/lib/positions/store";
import { formatPrice } from "@/lib/format";

function usd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

/**
 * Open positions.
 *
 * Rows are FLAT — hairline separated, no elevation. Depth is reserved for
 * controls, and a table of live numbers is the last place it belongs. The panel
 * around the table pays the depth tax once; the 40px rows keep full density.
 *
 * Positions live in localStorage, so this renders empty during SSR and fills in
 * on mount. That is why the empty state is deliberately neutral rather than
 * announcing "you have no positions" before it has looked.
 */
export function PositionsList({ markets }: { markets: Market[] }) {
  const positions = usePositions();
  const priceFor = (marketId: string) =>
    markets.find((m) => m.id === marketId)?.yesPrice ?? null;

  if (positions.length === 0) {
    return (
      <div className="panel px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No open positions</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted">
          Open one from any market and it will appear here with unrealized PnL and
          liquidation health.
        </p>
        <Link href="/" className="control mt-6 inline-block px-4 py-2 text-xs">
          Browse markets
        </Link>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden p-1.5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-xs">
          <thead>
            <tr className="text-left text-[10px] tracking-wide text-faint uppercase">
              <th scope="col" className="h-8 px-3 font-normal">Market</th>
              <th scope="col" className="h-8 px-3 font-normal">Side</th>
              <th scope="col" className="h-8 px-3 text-right font-normal">Size</th>
              <th scope="col" className="h-8 px-3 text-right font-normal">Entry</th>
              <th scope="col" className="h-8 px-3 text-right font-normal">Mark</th>
              <th scope="col" className="h-8 px-3 text-right font-normal">Liq.</th>
              <th scope="col" className="h-8 px-3 text-right font-normal">PnL</th>
              <th scope="col" className="h-8 px-3 text-right font-normal">Health</th>
              <th scope="col" className="h-8 px-3 font-normal"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {positions.map((stored) => {
              const mark = priceFor(stored.marketId);
              const position: Position = {
                side: stored.side,
                margin: stored.margin,
                leverage: stored.leverage,
                entryPrice: stored.entryPrice,
              };
              const liq = liquidationPrice(position);
              const pnl = mark === null ? null : unrealizedPnl(position, mark);
              const health = mark === null ? null : healthFactor(position, mark);
              const up = (pnl ?? 0) >= 0;

              return (
                <tr
                  key={stored.id}
                  className="h-10 border-t border-hairline transition-colors hover:bg-hover"
                >
                  <td className="max-w-[280px] truncate px-3">
                    <Link
                      href={`/markets/${stored.marketSlug}`}
                      className="text-foreground hover:underline"
                    >
                      {stored.marketQuestion}
                    </Link>
                  </td>
                  <td className="px-3">
                    {/* Label carries the meaning; colour reinforces it. */}
                    <span className={stored.side === "yes" ? "text-long" : "text-short"}>
                      {stored.side.toUpperCase()}
                    </span>
                    {/* Effective leverage, which tiered margin can drag below
                        what was selected. Shown to 1dp so 7.8x never rounds to
                        a flattering 8x; the selected value is in the tooltip. */}
                    <span
                      className="numeric ml-1.5 text-faint"
                      title={
                        stored.selectedLeverage &&
                        stored.selectedLeverage !== stored.leverage
                          ? `${stored.selectedLeverage}× selected, ${stored.leverage.toFixed(2)}× effective after tiered margin`
                          : undefined
                      }
                    >
                      {stored.leverage.toFixed(1)}×
                    </span>
                  </td>
                  <td className="numeric px-3 text-right text-foreground">
                    {usd(notionalFor(stored.margin, stored.leverage))}
                  </td>
                  <td className="numeric px-3 text-right text-muted">
                    {formatPrice(stored.entryPrice)}
                  </td>
                  <td className="numeric px-3 text-right text-muted">
                    {mark === null ? "—" : formatPrice(mark)}
                  </td>
                  <td className="numeric px-3 text-right text-warn">
                    {formatPrice(liq)}
                  </td>
                  <td
                    className={`numeric px-3 text-right ${up ? "text-long" : "text-short"}`}
                  >
                    {pnl === null ? (
                      "—"
                    ) : (
                      <>
                        <span aria-hidden>{up ? "▲" : "▼"}</span>{" "}
                        {up ? "+" : "−"}
                        {usd(Math.abs(pnl)).replace("$", "$")}
                      </>
                    )}
                  </td>
                  <td className="px-3 text-right">
                    {health === null ? (
                      <span className="numeric text-faint">—</span>
                    ) : (
                      <span className="flex items-center justify-end gap-2">
                        <span aria-hidden className="h-1.5 w-12 overflow-hidden rounded-sm bg-well">
                          <span
                            className={`block h-full ${health > 0.5 ? "bg-long" : "bg-warn"}`}
                            style={{ width: `${health * 100}%` }}
                          />
                        </span>
                        <span className="numeric text-muted">
                          {Math.round(health * 100)}%
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 text-right">
                    <button
                      type="button"
                      onClick={() => closePosition(stored.id)}
                      className="control h-7 px-2 text-[11px]"
                    >
                      Close
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
