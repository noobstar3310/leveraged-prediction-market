import { describe, expect, it } from "vitest";

import {
  MARKET_TIERS,
  ROBINHOOD_BTC_TIERS,
  marginRequirement,
  maxNotionalForMargin,
  type MarginTier,
} from "@/lib/leverage/tiers";

describe("marginRequirement — reproduces Robinhood's published examples", () => {
  const T = ROBINHOOD_BTC_TIERS;

  it("a position inside one tier uses that tier's rate", () => {
    // "$1,000,000 × 10% = $100,000"
    const r = marginRequirement(1_000_000, 10, T);
    expect(r.total).toBeCloseTo(100_000, 6);
    expect(r.slices).toHaveLength(1);
    expect(r.effectiveLeverage).toBeCloseTo(10, 10);
  });

  it("blends across two tiers like tax brackets ($1.3M example)", () => {
    // Tier 1 (10x): $1,000,000 x 10%    = $100,000
    // Tier 2  (7x):   $300,000 x 14.29% =  $42,870
    // Robinhood totals $142,870 using the rounded 14.29%; exact 1/7 gives
    // $142,857.14. Asserting both: the exact maths, and that we land within a
    // few dollars of their published figure (a wrong algorithm would be out by
    // thousands, not by rounding).
    const r = marginRequirement(1_300_000, 10, T);
    expect(r.total).toBeCloseTo(142_857.14, 2);
    expect(Math.abs(r.total - 142_870)).toBeLessThan(20);

    expect(r.slices).toHaveLength(2);
    expect(r.slices[0]).toMatchObject({ notional: 1_000_000, leverage: 10 });
    expect(r.slices[1]).toMatchObject({ notional: 300_000, leverage: 7 });
  });

  it("blends across two tiers ($1.4M example)", () => {
    // Tier 1: $100,000 + Tier 2: $400,000 x 14.29% = $57,160 -> $157,160
    const r = marginRequirement(1_400_000, 10, T);
    expect(r.total).toBeCloseTo(100_000 + 400_000 / 7, 2);
    expect(Math.abs(r.total - 157_160)).toBeLessThan(20);
  });

  it("matches the add-to-position example ($1.1M)", () => {
    // $1,000,000 at 10%: $100,000 + $100,000 at 14.29%: $14,290 = $114,290
    const r = marginRequirement(1_100_000, 10, T);
    expect(Math.abs(r.total - 114_290)).toBeLessThan(20);
  });

  it("reducing back into tier 1 drops the higher rate entirely", () => {
    // "You reduce a BTCUSD position of $1,300,000 by $300,000 ... $100,000"
    expect(marginRequirement(1_000_000, 10, T).total).toBeCloseTo(100_000, 6);
  });

  it("a tier caps leverage even when a higher one is selected", () => {
    // Selecting 10x cannot buy 10x treatment in a 7x tier.
    const r = marginRequirement(1_300_000, 10, T);
    expect(r.slices[1].leverage).toBe(7);
  });

  it("selecting BELOW the tier cap uses the selected leverage everywhere", () => {
    // At 5x, both tier 1 (max 10) and tier 2 (max 7) permit 5x.
    const r = marginRequirement(1_300_000, 5, T);
    expect(r.total).toBeCloseTo(1_300_000 / 5, 6);
    expect(r.slices.every((s) => s.leverage === 5)).toBe(true);
  });

  it("reports a blended rate and an effective leverage below the selected one", () => {
    const r = marginRequirement(1_300_000, 10, T);
    expect(r.blendedRate).toBeCloseTo(r.total / 1_300_000, 10);
    // 1.3M / 142857 ~= 9.1x, not the 10x selected.
    expect(r.effectiveLeverage).toBeGreaterThan(9);
    expect(r.effectiveLeverage).toBeLessThan(10);
  });
});

describe("marginRequirement — edge cases", () => {
  const T: MarginTier[] = [
    { maxNotional: 100, maxLeverage: 10 },
    { maxNotional: Infinity, maxLeverage: 2 },
  ];

  it("returns zero for a zero-size position", () => {
    const r = marginRequirement(0, 10, T);
    expect(r.total).toBe(0);
    expect(r.slices).toHaveLength(0);
  });

  it("spans into an unbounded final tier", () => {
    // 100 at 10x = 10, plus 100 at 2x = 50 -> 60
    expect(marginRequirement(200, 10, T).total).toBeCloseTo(60, 10);
  });

  it("never requires more than the notional itself", () => {
    const r = marginRequirement(1_000_000, 1, T);
    expect(r.total).toBeLessThanOrEqual(1_000_000 + 1e-6);
  });
});

describe("maxNotionalForMargin — the inverse", () => {
  const T = ROBINHOOD_BTC_TIERS;

  it("inverts marginRequirement inside one tier", () => {
    expect(maxNotionalForMargin(100_000, 10, T)).toBeCloseTo(1_000_000, 4);
  });

  it("inverts across a tier boundary", () => {
    const notional = maxNotionalForMargin(142_857.142857, 10, T);
    expect(notional).toBeCloseTo(1_300_000, 2);
  });

  it("round-trips for a spread of sizes", () => {
    for (const n of [50_000, 999_999, 1_000_001, 2_000_000, 7_500_000]) {
      const required = marginRequirement(n, 10, T).total;
      expect(maxNotionalForMargin(required, 10, T)).toBeCloseTo(n, 2);
    }
  });

  it("is zero for zero margin", () => {
    expect(maxNotionalForMargin(0, 10, T)).toBe(0);
  });
});

describe("MARKET_TIERS — this product's own table", () => {
  it("keeps 20x available for ordinary positions", () => {
    expect(MARKET_TIERS[0].maxLeverage).toBe(20);
    const r = marginRequirement(MARKET_TIERS[0].maxNotional, 20, MARKET_TIERS);
    expect(r.effectiveLeverage).toBeCloseTo(20, 10);
  });

  it("is ordered by ascending notional and descending leverage", () => {
    for (let i = 1; i < MARKET_TIERS.length; i++) {
      expect(MARKET_TIERS[i].maxNotional).toBeGreaterThan(MARKET_TIERS[i - 1].maxNotional);
      expect(MARKET_TIERS[i].maxLeverage).toBeLessThan(MARKET_TIERS[i - 1].maxLeverage);
    }
  });

  it("ends in an unbounded 1x tier so any size is priceable", () => {
    const last = MARKET_TIERS[MARKET_TIERS.length - 1];
    expect(last.maxNotional).toBe(Infinity);
    expect(last.maxLeverage).toBe(1);
  });

  it("drags effective leverage down on an oversized position", () => {
    const big = marginRequirement(500_000, 20, MARKET_TIERS);
    expect(big.effectiveLeverage).toBeLessThan(5);
  });
});
