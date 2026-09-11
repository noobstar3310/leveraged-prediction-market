"use client";

import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { Check } from "lucide-react";

import { outcomeLabels, type Market } from "@/lib/data/clients";
import {
  MAX_LEVERAGE,
  MIN_LEVERAGE,
  clampLeverage,
  healthFactor,
  payoutAtResolution,
  sharesFor,
  type Position,
  type Side,
} from "@/lib/leverage";
import type { MarginRequirement } from "@/lib/leverage/tiers";
import { openPosition } from "@/lib/positions/store";
import { notifyOrderPlaced } from "@/components/ui/toast";
import { useBalances } from "@/components/wallet/balances-provider";
import { formatPrice } from "@/lib/format";

const PRESET_MARGINS = [25, 100, 500, 1000];

function usd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

type Props = {
  market: Market;
  side: Side;
  margin: number;
  leverage: number;
  onSideChange: (side: Side) => void;
  onMarginChange: (margin: number) => void;
  onLeverageChange: (leverage: number) => void;
  /** Built with the EFFECTIVE leverage, after tiered margin. */
  position: Position;
  requirement: MarginRequirement & { notional: number };
  liquidation: number;
};

/**
 * Order entry.
 *
 * Controlled by MarketTerminal, which owns the draft so the chart can draw the
 * same liquidation line this panel reports.
 *
 * Every derived figure comes from lib/leverage — the tested, pure module. This
 * component does no maths of its own, deliberately: the liquidation price is the
 * number that decides whether someone loses everything, and it belongs somewhere
 * with tests, not inline in a form.
 *
 * Nothing animates. Side toggle, size and leverage are all 100+/day actions,
 * which the frequency gate disqualifies outright.
 */
export function TradePanel({
  market,
  side,
  margin,
  leverage,
  onSideChange,
  onMarginChange,
  onLeverageChange,
  position,
  requirement,
  liquidation,
}: Props) {
  const router = useRouter();
  const { isConnected: connected } = useAccount();
  const { login } = usePrivy();
  const { collateral, collateralSymbol, gasSymbol } = useBalances();

  const effectiveLeverage = requirement.effectiveLeverage;
  const tiered = requirement.slices.length > 1;
  const shares = sharesFor(position);
  const winPayout = payoutAtResolution(position, side);
  const health = healthFactor(position, market.yesPrice);
  const distanceToLiq = Math.abs(market.yesPrice - liquidation);
  const entryCost = side === "yes" ? market.yesPrice : market.noPrice;
  const sizeValid = margin > 0 && Number.isFinite(margin);
  // Real balance, so a real gate: you cannot post collateral you don't hold.
  const funded = collateral !== null && collateral >= margin;
  const valid = sizeValid && connected && funded;

  function confirm() {
    if (!valid) return;
    openPosition({
      marketId: market.id,
      marketSlug: market.slug,
      marketQuestion: market.question,
      side,
      margin,
      // Effective, not selected — the portfolio values the position against
      // what actually backs it.
      leverage: effectiveLeverage,
      selectedLeverage: leverage,
      entryPrice: market.yesPrice,
    });
    notifyOrderPlaced({
      side,
      leverage: effectiveLeverage,
      notional: requirement.notional,
      question: market.question,
      liquidationPrice: liquidation,
    });
    router.refresh();
  }

  return (
    <div className="panel flex flex-col gap-4 p-4">
      <SideToggle side={side} onChange={onSideChange} market={market} />

      <div>
        <label htmlFor="margin" className="mb-1.5 block text-[11px] text-faint">
          Collateral ({collateralSymbol})
        </label>
        <input
          id="margin"
          type="number"
          min={1}
          step={1}
          inputMode="decimal"
          value={margin}
          onChange={(e) => onMarginChange(Number(e.target.value))}
          className="well-field numeric h-9 w-full text-sm"
        />
        <div className="mt-2 flex gap-2">
          {PRESET_MARGINS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => onMarginChange(amount)}
              className="control numeric h-7 flex-1 text-[11px]"
            >
              {amount}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor="leverage" className="text-[11px] text-faint">
            Leverage
          </label>
          <span className="numeric text-sm text-foreground">
            {leverage}×
            {tiered && (
              <span className="ml-2 text-xs text-warn">
                → {effectiveLeverage.toFixed(2)}× effective
              </span>
            )}
          </span>
        </div>
        <input
          id="leverage"
          type="range"
          min={MIN_LEVERAGE}
          max={MAX_LEVERAGE}
          step={1}
          value={leverage}
          onChange={(e) => onLeverageChange(clampLeverage(Number(e.target.value)))}
          className="w-full accent-[var(--long)]"
          aria-describedby="liq-readout"
        />
        <div className="mt-1 flex justify-between text-[10px] text-faint">
          <span className="numeric">{MIN_LEVERAGE}×</span>
          <span className="numeric">{MAX_LEVERAGE}×</span>
        </div>
      </div>

      {/* The liquidation readout is flat text on the panel — the most important
          number on the screen gets no depth competing with it, and it is never
          hidden behind a disclosure. It is also drawn on the chart. */}
      <dl
        id="liq-readout"
        className="flex flex-col gap-2 border-t border-hairline pt-3 text-xs"
      >
        <Row label="Entry price" value={formatPrice(entryCost)} />
        <Row label="Position size" value={usd(requirement.notional)} />
        <Row
          label="Margin rate"
          value={`${(requirement.blendedRate * 100).toFixed(2)}%`}
          hint={tiered ? "blended" : undefined}
        />
        <Row label="Shares" value={shares.toFixed(1)} />
        <Row
          label="Liquidation price"
          value={formatPrice(liquidation)}
          tone="warn"
          hint={`${(distanceToLiq * 100).toFixed(1)} pts away`}
        />
        <Row
          label={`Payout if ${side.toUpperCase()}`}
          value={usd(winPayout)}
          tone="long"
        />
        <Row label="Max loss" value={usd(margin)} tone="short" />
      </dl>

      {tiered && (
        <div className="border-t border-hairline pt-3">
          <p className="mb-2 text-[10px] tracking-wide text-faint uppercase">
            Margin tiers · charged per slice
          </p>
          <ul className="flex flex-col gap-1 text-[11px]">
            {requirement.slices.map((slice) => (
              <li key={slice.tier} className="flex justify-between gap-3">
                <span className="text-faint">
                  <span className="numeric">{usd(slice.notional)}</span> at{" "}
                  <span className="numeric">{slice.leverage}×</span>
                </span>
                <span className="numeric text-muted">{usd(slice.margin)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-relaxed text-faint">
            Bigger positions sit in tiers that allow less leverage. Each slice is
            charged at its own tier&apos;s rate, so your effective leverage falls
            below the {leverage}× selected.
          </p>
        </div>
      )}

      <dl className="flex items-baseline justify-between border-t border-hairline pt-3 text-xs">
        <dt className="text-faint">Available to trade</dt>
        <dd className="numeric text-foreground">
          {collateral === null ? "—" : collateral.toFixed(2)} {collateralSymbol}
        </dd>
      </dl>

      <div>
        <div className="mb-1 flex items-baseline justify-between text-[10px] text-faint">
          <span>Health at current price</span>
          <span className="numeric">{Math.round(health * 100)}%</span>
        </div>
        <div aria-hidden className="h-1.5 w-full overflow-hidden rounded-sm bg-well">
          <div
            className={health > 0.5 ? "h-full bg-long" : "h-full bg-warn"}
            style={{ width: `${health * 100}%` }}
          />
        </div>
      </div>

      {!connected ? (
        <button
          type="button"
          // Opens Privy's modal — the same one the nav button uses, so a
          // trader is never offered two different ways to connect.
          onClick={() => login()}
          className="control h-10 w-full text-sm font-medium"
        >
          Connect wallet to trade
        </button>
      ) : (
        <button
          type="button"
          onClick={confirm}
          disabled={!valid}
          className="control h-10 w-full text-sm font-medium"
        >
          {!sizeValid
            ? "Enter a size"
            : !funded
              ? `Insufficient ${collateralSymbol}`
              : `Open ${side.toUpperCase()} · ${leverage}×`}
        </button>
      )}

      {/* One scannable line, not a paragraph. The shortfall is the only fact
          that matters here; the explanation lives on the link. */}
      {connected && !funded && sizeValid && (
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[11px] text-warn">
          <span>
            Need <span className="numeric">{usd(margin)}</span>, have{" "}
            <span className="numeric">
              {collateral === null ? "—" : usd(collateral)}
            </span>
          </span>
          <a
            href="/faucet"
            className="underline underline-offset-2"
            title={`Mint testnet ${collateralSymbol} with your connected wallet`}
          >
            Get {collateralSymbol} →
          </a>
        </p>
      )}

      {/* Collapsed by default. The numbers a trader acts on — liquidation
          price, max loss, health — stay fully visible above; only the modelling
          caveats are tucked away, and a <details> keeps them keyboard-reachable
          rather than hover-only. */}
      <details className="group">
        <summary className="cursor-pointer list-none text-[10px] text-faint transition-colors hover:text-muted">
          Simulated · assumptions
          <span aria-hidden className="ml-1 inline-block group-open:hidden">
            +
          </span>
          <span aria-hidden className="ml-1 hidden group-open:inline-block">
            −
          </span>
        </summary>
        <p className="mt-2 text-[10px] leading-relaxed text-faint">
          No order is routed and no money moves. Collateral, size and payouts are
          in {collateralSymbol}; {gasSymbol} pays network fees only. Trading fees, funding and
          maintenance margin are not modelled, so the liquidation price above is
          the optimistic bound — a real venue would close the position sooner.
        </p>
      </details>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "long" | "short" | "warn";
  hint?: string;
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
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-faint">{label}</dt>
      <dd className={`numeric ${toneClass}`}>
        {value}
        {hint && <span className="ml-2 text-[10px] text-faint">{hint}</span>}
      </dd>
    </div>
  );
}

/**
 * The selected side is RECESSED — pushed in — while the unselected side is
 * extruded. Depth-direction-as-state is the one place in this system where depth
 * means something other than "pressable".
 *
 * State is carried by four signals at once, only one of which is colour: depth,
 * rim, label colour, and a check glyph. A side-tinted fill measures about 1.07:1
 * against the ground, which is not a signal — it is a rumour.
 */
function SideToggle({
  side,
  onChange,
  market,
}: {
  side: Side;
  onChange: (side: Side) => void;
  market: Market;
}) {
  const options: { value: Side; label: string; price: number }[] = [
    { value: "yes", label: outcomeLabels(market)[0], price: market.yesPrice },
    { value: "no", label: outcomeLabels(market)[1], price: market.noPrice },
  ];

  return (
    <div role="group" aria-label="Side" className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const selected = side === option.value;
        const isYes = option.value === "yes";
        // Written out rather than interpolated: Tailwind scans source text, so a
        // `text-${accent}` template literal produces no class at all.
        const selectedText = isYes ? "text-long" : "text-short";
        const selectedRim = isYes ? "var(--rim-long)" : "var(--rim-short)";

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            style={selected ? { borderColor: selectedRim } : undefined}
            className={
              selected
                ? `well-field flex h-11 items-center justify-center gap-1.5 text-sm ${selectedText}`
                : "control flex h-11 items-center justify-center gap-1.5 text-sm"
            }
          >
            {selected && <Check aria-hidden size={14} strokeWidth={2.5} />}
            <span>{option.label}</span>
            <span className="numeric text-xs opacity-80">
              {formatPrice(option.price)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
