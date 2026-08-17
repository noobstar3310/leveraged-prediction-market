import Link from "next/link";

import type { Market } from "@/lib/data/clients";
import { priceHistoryFor } from "@/lib/data/mock/price-history";
import { PriceChart } from "@/components/market/price-chart";
import {
  formatCloseDate,
  formatPrice,
  formatProbability,
  formatUsdCompact,
} from "@/lib/format";

/**
 * A market tile.
 *
 * One uniform format — there is no small variant. Every tile is an E1 control:
 * rim + elevation + instant pressed state. Hover changes the FILL only, because
 * animating box-shadow is paint-bound and browsing means hovering constantly.
 *
 * The chart is a Client Component island; everything around it stays server-
 * rendered.
 */
export function MarketCard({ market }: { market: Market }) {
  const yesPercent = Math.min(Math.max(market.yesPrice, 0), 1) * 100;
  const history = priceHistoryFor(market);

  return (
    <div className="panel flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-widest text-faint uppercase">
            {market.category}
          </p>
          {/* The link wraps only the heading, not the card: the chart inside is
              interactive, and nesting controls inside an anchor is invalid and
              breaks keyboard navigation. */}
          <h2 className="mt-1 text-sm leading-snug font-medium">
            <Link
              href={`/markets/${market.slug}`}
              className="text-foreground hover:underline focus-visible:underline"
            >
              {market.question}
            </Link>
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <span className="numeric block text-2xl leading-none text-foreground">
            {formatProbability(market.yesPrice)}
          </span>
          <span className="mt-1 block text-[10px] text-faint">chance of yes</span>
        </div>
      </div>

      <PriceChart points={history} label={market.question} />

      {/* Flat fill, not a recessed well: depth means interactive, and this is a
          readout. Redundant with the percentage, so hidden from AT. */}
      <div aria-hidden className="h-1.5 w-full overflow-hidden rounded-sm bg-well">
        <div className="h-full bg-long" style={{ width: `${yesPercent}%` }} />
      </div>

      <dl className="mt-auto grid grid-cols-4 gap-3 border-t border-hairline pt-3 text-xs">
        <div>
          <dt className="text-[10px] tracking-wide text-faint uppercase">Yes</dt>
          {/* "Yes"/"No" labels carry the meaning, so colour is reinforcement
              rather than the only signal. */}
          <dd className="numeric mt-0.5 text-long">
            {formatPrice(market.yesPrice)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] tracking-wide text-faint uppercase">No</dt>
          <dd className="numeric mt-0.5 text-short">
            {formatPrice(market.noPrice)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] tracking-wide text-faint uppercase">
            24h vol
          </dt>
          <dd className="numeric mt-0.5 text-foreground">
            {formatUsdCompact(market.volume24h)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] tracking-wide text-faint uppercase">
            Closes
          </dt>
          <dd className="numeric mt-0.5 text-foreground">
            {formatCloseDate(market.closesAt)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
