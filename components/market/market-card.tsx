import Link from "next/link";

import type { Market } from "@/lib/data/clients";
import {
  formatCloseDate,
  formatPrice,
  formatProbability,
  formatUsdCompact,
} from "@/lib/format";

/**
 * A single market in the browse grid.
 *
 * Cards are a documented exception to the no-cards rule, and apply ONLY to this
 * browse surface — see .claude/skills/design-system/SKILL.md. Hover is a
 * background color change, never a transform: browsing means hovering
 * constantly, which sits squarely in the frequency gate's "no animation" band.
 */
export function MarketCard({ market }: { market: Market }) {
  const yesPercent = Math.min(Math.max(market.yesPrice, 0), 1) * 100;

  return (
    <Link
      href={`/markets/${market.slug}`}
      className="flex h-full flex-col gap-3 rounded-sm border border-hairline bg-surface p-4 transition-colors hover:bg-raised"
    >
      <p className="text-[10px] tracking-widest text-faint uppercase">
        {market.category}
      </p>

      <h2 className="line-clamp-3 text-sm leading-snug font-medium text-foreground">
        {market.question}
      </h2>

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="numeric text-2xl leading-none text-foreground">
            {formatProbability(market.yesPrice)}
          </span>
          <span className="text-xs text-faint">chance of yes</span>
        </div>
        {/* Redundant with the percentage above, so hidden from assistive tech. */}
        <div aria-hidden className="h-1 w-full overflow-hidden bg-raised">
          <div className="h-full bg-long" style={{ width: `${yesPercent}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-hairline pt-3 text-xs">
        <div className="flex gap-3">
          {/* "Yes"/"No" labels carry the meaning, so color is reinforcement
              rather than the only signal. */}
          <span className="text-long">
            Yes <span className="numeric">{formatPrice(market.yesPrice)}</span>
          </span>
          <span className="text-short">
            No <span className="numeric">{formatPrice(market.noPrice)}</span>
          </span>
        </div>
        <div className="flex shrink-0 gap-2 text-faint">
          <span className="numeric">{formatUsdCompact(market.volume24h)}</span>
          <span aria-hidden>·</span>
          <span>{formatCloseDate(market.closesAt)}</span>
        </div>
      </div>
    </Link>
  );
}
