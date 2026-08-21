/**
 * Fabricated price history.
 *
 * Every point is invented. The series is generated deterministically from the
 * market id — no Math.random, no Date.now — so a market's chart is identical on
 * the server, on the client, and across reloads. A chart that redrew differently
 * on hydration would be both a bug and a lie.
 *
 * The series is walked BACKWARDS from the market's current price, so its final
 * point equals `market.yesPrice` exactly. A chart that disagreed with the number
 * printed beside it would be worse than no chart.
 */

import type { Market } from "@/lib/data/clients";

export type PricePoint = {
  /** ISO 8601, midnight UTC. */
  date: string;
  /** Probability of YES in [0, 1]. */
  price: number;
};

/** Frozen "today" for the mock dataset. Keeps every series reproducible. */
const AS_OF = Date.UTC(2026, 7, 17); // 2026-08-17

/**
 * 90 points, not 30.
 *
 * Density is what makes a crosshair feel smooth: at 30 points across a ~300px
 * card each step is a visible ~10px jump. At 90 it is ~3px and reads as
 * continuous — without interpolating values that were never real.
 */
const DAYS = 90;
const DAY_MS = 86_400_000;

/** Deterministic 32-bit hash of a string. */
function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, well-distributed seeded PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A 90-day daily series ending at the market's current price.
 *
 * Volatility scales with how uncertain the market is: a question sitting at 50%
 * moves far more than one parked at 3%, which is how real prediction markets
 * behave. Without this, near-certain markets get implausibly jumpy charts.
 */
export function priceHistoryFor(market: Market): PricePoint[] {
  const rand = mulberry32(hashString(market.id));

  // 4·p·(1−p) peaks at 1.0 when p = 0.5 and approaches 0 at the extremes.
  const uncertainty = 4 * market.yesPrice * (1 - market.yesPrice);
  // Smaller per-step move now that there are 3x as many steps, so the series
  // covers a comparable range rather than wandering three times as far.
  const step = 0.0035 + 0.016 * uncertainty;

  const prices: number[] = [market.yesPrice];
  for (let i = 1; i < DAYS; i++) {
    const drift = (rand() - 0.5) * 2 * step;
    const previous = prices[0] - drift;
    // Keep inside (0,1) without letting the clamp flatten the tail.
    prices.unshift(Math.min(Math.max(previous, 0.01), 0.99));
  }

  return prices.map((price, i) => ({
    date: new Date(AS_OF - (DAYS - 1 - i) * DAY_MS).toISOString(),
    price: Number(price.toFixed(4)),
  }));
}
