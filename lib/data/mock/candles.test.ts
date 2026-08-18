import { describe, expect, it } from "vitest";

import { candlesFor } from "@/lib/data/mock/candles";
import type { Market } from "@/lib/data/clients";

const market: Market = {
  id: "mock-001",
  slug: "test",
  question: "Test?",
  category: "Crypto",
  yesPrice: 0.64,
  noPrice: 0.36,
  volume24h: 250_000,
  volumeTotal: 1_000_000,
  closesAt: "2027-01-01T00:00:00.000Z",
};

describe("candlesFor", () => {
  it("ends at the market's current price, so chart and number agree", () => {
    const candles = candlesFor(market);
    expect(candles[candles.length - 1].close).toBeCloseTo(market.yesPrice, 4);
  });

  it("is deterministic — same market, same series", () => {
    expect(candlesFor(market)).toEqual(candlesFor(market));
  });

  it("never produces a bar whose wick is inside its body", () => {
    for (const c of candlesFor(market)) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close) - 1e-9);
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close) + 1e-9);
    }
  });

  it("stays inside (0, 1)", () => {
    for (const c of candlesFor(market)) {
      expect(c.low).toBeGreaterThan(0);
      expect(c.high).toBeLessThan(1);
    }
  });
});
