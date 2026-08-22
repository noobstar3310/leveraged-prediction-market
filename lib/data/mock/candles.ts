/**
 * Fabricated OHLCV candles.
 *
 * Same contract as the sparkline series: deterministic from the market id, and
 * walked BACKWARDS so the final close equals the market's current price exactly.
 * A candle chart that disagreed with the price printed above it would be worse
 * than no chart.
 */

import type { Market } from "@/lib/data/clients";

export type { Candle } from "@/lib/data/clients";
import type { Candle } from "@/lib/data/clients";

/** Frozen "today" for the mock dataset. Keeps every series reproducible. */
const AS_OF = Date.UTC(2026, 7, 17); // 2026-08-17
const DAY_MS = 86_400_000;
const BARS = 120;

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

const clamp01 = (v: number) => Math.min(Math.max(v, 0.005), 0.995);

/**
 * 120 daily candles ending at the market's current price.
 *
 * Volatility scales with uncertainty — 4·p·(1−p) peaks at 50% and vanishes at the
 * extremes — because a market parked at 3% genuinely does not move much. Without
 * it, near-resolved markets get implausibly dramatic candles.
 */
export function candlesFor(market: Market): Candle[] {
  const rand = mulberry32(hashString(`${market.id}:candles`));
  const uncertainty = 4 * market.yesPrice * (1 - market.yesPrice);
  const step = 0.005 + 0.022 * uncertainty;

  // Closes, newest first, then reversed.
  const closes: number[] = [market.yesPrice];
  for (let i = 1; i < BARS; i++) {
    const drift = (rand() - 0.5) * 2 * step;
    closes.push(clamp01(closes[closes.length - 1] - drift));
  }
  closes.reverse();

  return closes.map((close, i) => {
    const open = i === 0 ? clamp01(close - (rand() - 0.5) * step) : closes[i - 1];
    // Wick beyond the body, never inside it — otherwise the bar renders inverted.
    const body = Math.abs(close - open);
    const wick = body * 0.4 + step * (0.25 + rand() * 0.5);
    const high = clamp01(Math.max(open, close) + wick * rand());
    const low = clamp01(Math.min(open, close) - wick * rand());

    // Volume tracks range: busy days move more.
    const range = Math.abs(high - low);
    const volume = Math.round(
      (market.volume24h / 1000) * (0.35 + (range / (step + 1e-9)) * 0.4 + rand() * 0.4),
    );

    return {
      time: new Date(AS_OF - (BARS - 1 - i) * DAY_MS).toISOString().slice(0, 10),
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4)),
      volume: Math.max(volume, 1),
    };
  });
}
