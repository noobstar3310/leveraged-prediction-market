"use client";

import { useMemo, useState } from "react";

import type { Market } from "@/lib/data/clients";
import type { Candle } from "@/lib/data/mock/candles";
import { liquidationPrice, type Position, type Side } from "@/lib/leverage";
import {
  MARKET_TIERS,
  marginRequirement,
  maxNotionalForMargin,
} from "@/lib/leverage/tiers";
import { CandleChart } from "@/components/market/candle-chart";
import { TradePanel } from "@/components/trade/trade-panel";

/**
 * Chart + order entry, sharing one draft position.
 *
 * The state lives here rather than inside TradePanel so the chart can draw the
 * liquidation line the trader is currently configuring — the way an exchange
 * does. Seeing that line move up the candles as you drag the leverage slider is
 * the single most informative thing on this screen: it turns "20x" from a
 * multiplier into a visible distance from the current price.
 *
 * The chart always shows the YES series, whichever side is selected.
 */
export function MarketTerminal({
  market,
  candles,
}: {
  market: Market;
  candles: Candle[];
}) {
  const [side, setSide] = useState<Side>("yes");
  const [margin, setMargin] = useState(100);
  const [leverage, setLeverage] = useState(5);

  /**
   * Tiered margin: collateral does NOT simply buy `margin x leverage`. Larger
   * positions fall into tiers permitting less leverage, and each slice is
   * charged at its own tier's rate.
   */
  const requirement = useMemo(() => {
    const notional = maxNotionalForMargin(margin, leverage, MARKET_TIERS);
    return { notional, ...marginRequirement(notional, leverage, MARKET_TIERS) };
  }, [margin, leverage]);

  /**
   * Downstream maths uses the EFFECTIVE leverage, never the selected one. A
   * trader who picked 20x but is really at 7.8x must see the 7.8x liquidation
   * price — showing the 20x one would err in the dangerous direction.
   */
  const position: Position = useMemo(
    () => ({
      side,
      margin,
      leverage: requirement.effectiveLeverage,
      entryPrice: market.yesPrice,
    }),
    [side, margin, requirement.effectiveLeverage, market.yesPrice],
  );

  const liq = liquidationPrice(position);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
      <section
        aria-label="Price chart"
        className="panel h-[420px] overflow-hidden p-2 xl:h-[560px]"
      >
        <CandleChart
          candles={candles}
          entryPrice={market.yesPrice}
          liquidationPrice={liq}
        />
      </section>

      <section aria-label="Order entry">
        <TradePanel
          market={market}
          side={side}
          margin={margin}
          leverage={leverage}
          onSideChange={setSide}
          onMarginChange={setMargin}
          onLeverageChange={setLeverage}
          position={position}
          requirement={requirement}
          liquidation={liq}
        />
      </section>
    </div>
  );
}
