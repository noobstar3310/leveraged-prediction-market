import { describe, expect, it } from "vitest";

import {
  MAX_LEVERAGE,
  clampLeverage,
  healthFactor,
  liquidationPrice,
  marginFor,
  notionalFor,
  payoutAtResolution,
  sharesFor,
  unrealizedPnl,
  type Position,
} from "@/lib/leverage";

const yes20 = (overrides: Partial<Position> = {}): Position => ({
  side: "yes",
  margin: 100,
  leverage: 20,
  entryPrice: 0.64,
  ...overrides,
});

describe("notional and margin", () => {
  it("notional is margin times leverage", () => {
    expect(notionalFor(100, 20)).toBe(2000);
    expect(notionalFor(50, 1)).toBe(50);
  });

  it("margin is the inverse of notional", () => {
    expect(marginFor(2000, 20)).toBe(100);
    expect(marginFor(notionalFor(37, 7), 7)).toBeCloseTo(37, 10);
  });

  it("shares are notional divided by the side's entry price", () => {
    // YES at 0.50 with 1000 notional buys 2000 shares.
    expect(sharesFor({ ...yes20(), entryPrice: 0.5, margin: 100, leverage: 10 })).toBeCloseTo(2000, 10);
    // NO at 0.50 (i.e. YES 0.50) is symmetric.
    expect(sharesFor({ side: "no", margin: 100, leverage: 10, entryPrice: 0.5 })).toBeCloseTo(2000, 10);
    // NO at YES-price 0.80 costs 0.20 per share.
    expect(sharesFor({ side: "no", margin: 100, leverage: 1, entryPrice: 0.8 })).toBeCloseTo(500, 10);
  });
});

describe("clampLeverage", () => {
  it("holds leverage inside 1..MAX_LEVERAGE", () => {
    expect(clampLeverage(0)).toBe(1);
    expect(clampLeverage(0.5)).toBe(1);
    expect(clampLeverage(7)).toBe(7);
    expect(clampLeverage(MAX_LEVERAGE + 5)).toBe(MAX_LEVERAGE);
  });

  it("caps at 20x, the product's stated maximum", () => {
    expect(MAX_LEVERAGE).toBe(20);
  });
});

describe("liquidationPrice", () => {
  it("YES liquidates below entry, proportional to leverage", () => {
    // p_liq = p0 * (1 - 1/L)
    expect(liquidationPrice(yes20())).toBeCloseTo(0.608, 10);
    expect(liquidationPrice(yes20({ entryPrice: 0.5, leverage: 2 }))).toBeCloseTo(0.25, 10);
  });

  it("NO liquidates above entry, symmetrically", () => {
    // p_liq = p0 + (1 - p0)/L
    expect(liquidationPrice({ side: "no", margin: 100, leverage: 20, entryPrice: 0.64 })).toBeCloseTo(0.658, 10);
    expect(liquidationPrice({ side: "no", margin: 100, leverage: 2, entryPrice: 0.5 })).toBeCloseTo(0.75, 10);
  });

  it("at 1x a position cannot be liquidated before resolution", () => {
    expect(liquidationPrice(yes20({ leverage: 1, entryPrice: 0.5 }))).toBeCloseTo(0, 10);
    expect(liquidationPrice({ side: "no", margin: 100, leverage: 1, entryPrice: 0.5 })).toBeCloseTo(1, 10);
  });

  /**
   * The invariant CLAUDE.md states in prose: a 20x YES position entered at 0.64
   * liquidates after roughly a 3-point adverse move. If this ever fails, either
   * the maths or the documented product promise has changed.
   */
  it("matches the documented 20x-at-0.64 example", () => {
    const move = 0.64 - liquidationPrice(yes20());
    expect(move).toBeGreaterThan(0.025);
    expect(move).toBeLessThan(0.04);
  });
});

describe("unrealizedPnl", () => {
  it("is zero at the entry price", () => {
    expect(unrealizedPnl(yes20(), 0.64)).toBeCloseTo(0, 10);
    expect(unrealizedPnl({ side: "no", margin: 100, leverage: 20, entryPrice: 0.64 }, 0.64)).toBeCloseTo(0, 10);
  });

  it("equals exactly minus the margin at the liquidation price", () => {
    const long = yes20();
    expect(unrealizedPnl(long, liquidationPrice(long))).toBeCloseTo(-long.margin, 8);

    const short: Position = { side: "no", margin: 250, leverage: 5, entryPrice: 0.3 };
    expect(unrealizedPnl(short, liquidationPrice(short))).toBeCloseTo(-short.margin, 8);
  });

  it("scales linearly with leverage", () => {
    const at2x = unrealizedPnl(yes20({ leverage: 2, entryPrice: 0.5 }), 0.55);
    const at20x = unrealizedPnl(yes20({ leverage: 20, entryPrice: 0.5 }), 0.55);
    expect(at20x).toBeCloseTo(at2x * 10, 8);
  });

  it("YES gains when the price rises, NO gains when it falls", () => {
    expect(unrealizedPnl(yes20({ entryPrice: 0.5 }), 0.6)).toBeGreaterThan(0);
    expect(unrealizedPnl(yes20({ entryPrice: 0.5 }), 0.4)).toBeLessThan(0);
    const no: Position = { side: "no", margin: 100, leverage: 5, entryPrice: 0.5 };
    expect(unrealizedPnl(no, 0.4)).toBeGreaterThan(0);
    expect(unrealizedPnl(no, 0.6)).toBeLessThan(0);
  });
});

describe("healthFactor", () => {
  it("is 1 at entry and 0 at liquidation", () => {
    const p = yes20();
    expect(healthFactor(p, p.entryPrice)).toBeCloseTo(1, 10);
    expect(healthFactor(p, liquidationPrice(p))).toBeCloseTo(0, 8);
  });

  it("never reports below zero once past liquidation", () => {
    const p = yes20();
    expect(healthFactor(p, 0.1)).toBe(0);
  });

  it("is capped at 1 when the position is in profit", () => {
    const p = yes20({ entryPrice: 0.5 });
    expect(healthFactor(p, 0.9)).toBe(1);
  });
});

describe("payoutAtResolution", () => {
  it("returns the full share value less borrowed notional when the side wins", () => {
    // 1x YES at 0.50: 100 margin buys 200 shares, nothing borrowed -> 200 back.
    expect(payoutAtResolution({ side: "yes", margin: 100, leverage: 1, entryPrice: 0.5 }, "yes")).toBeCloseTo(200, 8);
    // 10x YES at 0.50: 1000 notional -> 2000 shares, repay 900 borrowed -> 1100.
    expect(payoutAtResolution({ side: "yes", margin: 100, leverage: 10, entryPrice: 0.5 }, "yes")).toBeCloseTo(1100, 8);
  });

  it("returns zero when the side loses", () => {
    expect(payoutAtResolution(yes20(), "no")).toBe(0);
    expect(payoutAtResolution({ side: "no", margin: 100, leverage: 3, entryPrice: 0.4 }, "yes")).toBe(0);
  });

  it("profit scales with leverage", () => {
    const one = payoutAtResolution({ side: "yes", margin: 100, leverage: 1, entryPrice: 0.5 }, "yes") - 100;
    const ten = payoutAtResolution({ side: "yes", margin: 100, leverage: 10, entryPrice: 0.5 }, "yes") - 100;
    expect(ten).toBeCloseTo(one * 10, 8);
  });

  it("NO pays out on a NO resolution", () => {
    // NO at YES-price 0.80 costs 0.20/share: 100 margin at 1x buys 500 shares.
    expect(payoutAtResolution({ side: "no", margin: 100, leverage: 1, entryPrice: 0.8 }, "no")).toBeCloseTo(500, 8);
  });
});
