import Link from "next/link";

import type { Market } from "@/lib/data/clients";
import { priceHistoryFor } from "@/lib/data/mock/price-history";
import { PriceChart } from "@/components/market/price-chart";
import {
  formatCloseDate,
  formatMultiplier,
  formatProbability,
  formatUsdCompact,
} from "@/lib/format";

/**
 * A market tile.
 *
 * Layout follows Hyperliquid's outcome cards: question, then one row per
 * outcome carrying its payout multiplier and a probability badge, then a volume
 * footer behind a hairline. The sparkline is our addition — it sits above the
 * outcome rows rather than replacing them.
 *
 * This is a `.panel`, not a `.control`: it holds interactive children (the
 * heading link and the chart), so it must not claim to be pressable itself.
 */
export function MarketCard({ market }: { market: Market }) {
  const history = priceHistoryFor(market);

  return (
    <div className="panel flex h-full flex-col gap-4 p-5">
      <div>
        <p className="text-[10px] tracking-widest text-faint uppercase">
          {market.category}
        </p>
        {/* The link wraps only the heading, not the card: the chart below is
            interactive, and nesting controls inside an anchor is invalid and
            breaks keyboard navigation. */}
        <h2 className="mt-1.5 line-clamp-2 text-sm leading-snug font-medium">
          <Link
            href={`/markets/${market.slug}`}
            className="text-foreground hover:underline focus-visible:underline"
          >
            {market.question}
          </Link>
        </h2>
      </div>

      <PriceChart points={history} label={market.question} />

      <div className="flex flex-col gap-2">
        <OutcomeRow label="Yes" price={market.yesPrice} side="long" />
        <OutcomeRow label="No" price={market.noPrice} side="short" />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-hairline pt-3 text-xs text-faint">
        <span>
          <span className="numeric">{formatUsdCompact(market.volume24h)}</span>{" "}
          24h volume
        </span>
        <span>closes {formatCloseDate(market.closesAt)}</span>
      </div>
    </div>
  );
}

/**
 * One outcome: name, what a winning dollar returns, and the implied probability.
 *
 * The multiplier is the more actionable number for a trader ("pay $1, get
 * $1.52 back"), so it sits beside the label; the percentage is the badge on the
 * right. Colour only ever reinforces — the words "Yes" and "No" carry the
 * meaning, so the row is readable with no colour perception at all.
 */
function OutcomeRow({
  label,
  price,
  side,
}: {
  label: string;
  price: number;
  side: "long" | "short";
}) {
  const isLong = side === "long";
  const dot = isLong ? "bg-long" : "bg-short";
  // Written out, not interpolated: Tailwind scans source text, so a
  // `text-${side}` template literal produces no class at all.
  const badge = isLong
    ? "border-long/50 text-long"
    : "border-short/50 text-short";

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-baseline gap-2">
        <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${dot}`} />
        <span className="text-sm text-foreground">{label}</span>
        <span className="numeric text-xs text-faint">
          {formatMultiplier(price)}
        </span>
      </span>
      {/* Flat outlined chip, never extruded: it is a readout, and nothing under
          32px gets depth. */}
      <span
        className={`numeric rounded-sm border px-2.5 py-1 text-xs ${badge}`}
      >
        {formatProbability(price)}
      </span>
    </div>
  );
}
