/**
 * Tiered margin — PURE.
 *
 * Models the scheme Robinhood documents for perpetual futures: margin
 * requirements come from *position size*, not from the leverage you picked.
 * Bigger positions sit in higher tiers that permit less leverage, and a position
 * spanning tiers pays each tier's rate on its own slice — exactly like income
 * tax brackets.
 *
 * ## Why this exists
 *
 * Without it, 20x is available at any size, which quietly assumes a liquidator
 * could unwind an arbitrarily large position at the price on screen. They can't.
 * Requiring more collateral as size grows is how real venues price that risk.
 *
 * ## The rule
 *
 * For each slice of the position that falls in tier `t`:
 *
 *   rate = 1 / min(selectedLeverage, t.maxLeverage)
 *
 * So selecting 10x buys 10x treatment only in tiers that allow at least 10x.
 * In a 7x tier the slice is charged at 1/7, no matter what you selected.
 *
 * The trader still *sees* the leverage they chose; what changes is the margin
 * required, and therefore the effective leverage they actually get.
 *
 * Verified against Robinhood's published worked examples in tiers.test.ts.
 */

export type MarginTier = {
  /** Upper bound of cumulative notional for this tier. `Infinity` for the last. */
  maxNotional: number;
  /** Highest leverage permitted for a slice sitting in this tier. */
  maxLeverage: number;
};

export type MarginSlice = {
  /** Index into the tier table. */
  tier: number;
  /** How much of the position sits in this tier. */
  notional: number;
  /** The leverage actually applied — min(selected, tier max). */
  leverage: number;
  /** 1 / leverage. */
  rate: number;
  /** notional × rate. */
  margin: number;
};

export type MarginRequirement = {
  /** Total collateral required for the whole position. */
  total: number;
  /** total ÷ notional — the blended rate across tiers. */
  blendedRate: number;
  /**
   * notional ÷ total. Equals the selected leverage while the position fits in a
   * tier that permits it, and falls below it once higher tiers are involved.
   */
  effectiveLeverage: number;
  /** Per-tier breakdown, for showing the trader why the number is what it is. */
  slices: MarginSlice[];
};

/**
 * Robinhood's published BTC/ETH/SOL/XRP table.
 *
 * Present ONLY as a test fixture — it is the reference our implementation is
 * checked against, so the blending algorithm is provably the same one. It is not
 * used by the app; this product's own table is MARKET_TIERS.
 */
export const ROBINHOOD_BTC_TIERS: MarginTier[] = [
  { maxNotional: 1_000_000, maxLeverage: 10 },
  { maxNotional: 1_500_000, maxLeverage: 7 },
  { maxNotional: 2_500_000, maxLeverage: 5 },
  { maxNotional: 5_000_000, maxLeverage: 4 },
  { maxNotional: 10_000_000, maxLeverage: 3 },
  { maxNotional: 20_000_000, maxLeverage: 2 },
  { maxNotional: Infinity, maxLeverage: 1 },
];

/**
 * This product's tiers, denominated in the settlement token.
 *
 * Scaled far below Robinhood's because these are prediction markets: a busy one
 * here turns over ~$1M in 24h, so a $250k position is already a large fraction
 * of the book. The headline 20x survives for ordinary retail size and decays
 * from there.
 *
 * Robinhood varies its table per contract. We use one table for every market —
 * a simplification worth revisiting, since a $50k-volume market plainly cannot
 * support the same size as a $1.2M one.
 */
export const MARKET_TIERS: MarginTier[] = [
  { maxNotional: 10_000, maxLeverage: 20 },
  { maxNotional: 50_000, maxLeverage: 10 },
  { maxNotional: 250_000, maxLeverage: 5 },
  { maxNotional: 1_000_000, maxLeverage: 2 },
  { maxNotional: Infinity, maxLeverage: 1 },
];

/** Collateral required to hold `notional` at `selectedLeverage`. */
export function marginRequirement(
  notional: number,
  selectedLeverage: number,
  tiers: MarginTier[] = MARKET_TIERS,
): MarginRequirement {
  const slices: MarginSlice[] = [];
  let remaining = Math.max(notional, 0);
  let floor = 0;
  let total = 0;

  for (let i = 0; i < tiers.length && remaining > 0; i++) {
    const tier = tiers[i];
    const capacity = tier.maxNotional - floor;
    const slice = Math.min(remaining, capacity);
    if (slice > 0) {
      const leverage = Math.min(selectedLeverage, tier.maxLeverage);
      const rate = 1 / leverage;
      const margin = slice * rate;
      slices.push({ tier: i, notional: slice, leverage, rate, margin });
      total += margin;
      remaining -= slice;
    }
    floor = tier.maxNotional;
  }

  return {
    total,
    blendedRate: notional > 0 ? total / notional : 0,
    effectiveLeverage: total > 0 ? notional / total : selectedLeverage,
    slices,
  };
}

/**
 * The inverse: the largest position `margin` can support at `selectedLeverage`.
 *
 * Walks the same tiers, spending collateral tier by tier. Solved exactly rather
 * than by search — the requirement is piecewise-linear and strictly increasing
 * in notional, so each tier's capacity has a known cost.
 */
export function maxNotionalForMargin(
  margin: number,
  selectedLeverage: number,
  tiers: MarginTier[] = MARKET_TIERS,
): number {
  let budget = Math.max(margin, 0);
  let notional = 0;
  let floor = 0;

  for (const tier of tiers) {
    if (budget <= 0) break;
    const capacity = tier.maxNotional - floor;
    const rate = 1 / Math.min(selectedLeverage, tier.maxLeverage);
    const costOfFullTier = capacity * rate;

    if (budget >= costOfFullTier) {
      notional += capacity;
      budget -= costOfFullTier;
    } else {
      notional += budget / rate;
      budget = 0;
    }
    floor = tier.maxNotional;
  }

  return notional;
}
