/**
 * Leverage maths — PURE.
 *
 * No React, no chain code, no fetch, no imports from anywhere else in the app. Just
 * functions over numbers. This is the one module here that can be wrong without
 * looking wrong on screen, which is why it is the only place TDD is mandatory.
 * It doubles as the executable spec for the future BNB Chain contract.
 *
 * ## The model
 *
 * A trader posts `margin` and picks `leverage`, giving notional `N = margin × L`.
 * That notional buys shares of one side at that side's price:
 *
 *   YES costs `p` per share, NO costs `1 − p`, where `p` is the market's YES
 *   probability. Each share pays out 1 if its side resolves true, else 0.
 *
 *   shares Q = N / entryCost
 *   PnL(mark) = Q × (markCost − entryCost)
 *
 * Liquidation is the mark price at which PnL equals −margin, i.e. the collateral
 * is exhausted:
 *
 *   YES:  p_liq = p₀ × (1 − 1/L)
 *   NO:   p_liq = p₀ + (1 − p₀)/L
 *
 * At 1× neither side can be liquidated before resolution, which is why the YES
 * formula bottoms out at 0 and the NO formula tops out at 1.
 *
 * ## Deliberately not modelled yet
 *
 * Trading fees, funding rates, slippage, partial liquidation, and maintenance
 * margin above zero. Every function here assumes a position is liquidated exactly
 * when equity hits zero. Real venues liquidate earlier, at a maintenance
 * threshold — so these liquidation prices are the *optimistic* bound.
 */

export type Side = "yes" | "no";

export type Outcome = "yes" | "no";

export type Position = {
  side: Side;
  /** Collateral posted, in USDC. Must be > 0. */
  margin: number;
  /** 1..MAX_LEVERAGE. */
  leverage: number;
  /** The market's YES probability at entry, in (0, 1). */
  entryPrice: number;
};

export const MAX_LEVERAGE = 20;
export const MIN_LEVERAGE = 1;

/** Keeps prices off 0 and 1, where share cost would be zero and shares infinite. */
const EPSILON = 1e-6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function safePrice(price: number): number {
  return clamp(price, EPSILON, 1 - EPSILON);
}

/** The cost of one share of `side` when the market prices YES at `price`. */
function costPerShare(side: Side, price: number): number {
  const p = safePrice(price);
  return side === "yes" ? p : 1 - p;
}

export function clampLeverage(leverage: number): number {
  if (!Number.isFinite(leverage)) return MIN_LEVERAGE;
  return clamp(leverage, MIN_LEVERAGE, MAX_LEVERAGE);
}

export function notionalFor(margin: number, leverage: number): number {
  return margin * leverage;
}

export function marginFor(notional: number, leverage: number): number {
  return notional / leverage;
}

export function sharesFor(position: Position): number {
  const notional = notionalFor(position.margin, position.leverage);
  return notional / costPerShare(position.side, position.entryPrice);
}

/**
 * The YES-probability at which this position's margin is exhausted.
 *
 * Always expressed in YES terms regardless of side, so it can be compared
 * directly against the market price shown everywhere else in the UI.
 */
export function liquidationPrice(position: Position): number {
  const leverage = clampLeverage(position.leverage);
  const p0 = safePrice(position.entryPrice);

  if (position.side === "yes") {
    return clamp(p0 * (1 - 1 / leverage), 0, 1);
  }
  return clamp(p0 + (1 - p0) / leverage, 0, 1);
}

/** Mark-to-market profit or loss, in USDC. Negative is a loss. */
export function unrealizedPnl(position: Position, markPrice: number): number {
  const entryCost = costPerShare(position.side, position.entryPrice);
  const markCost = costPerShare(position.side, markPrice);
  return sharesFor(position) * (markCost - entryCost);
}

/**
 * Remaining collateral as a fraction of what was posted: 1 at entry, 0 at
 * liquidation. Clamped, because a position is closed at 0 — it cannot go
 * further negative from the trader's side, and showing a value above 1 for a
 * profitable position would misrepresent what "health" means.
 */
export function healthFactor(position: Position, markPrice: number): number {
  if (position.margin <= 0) return 0;
  const equity = position.margin + unrealizedPnl(position, markPrice);
  return clamp(equity / position.margin, 0, 1);
}

/**
 * USDC returned if the market resolves to `outcome`.
 *
 * A winning share pays 1. The trader keeps the share value less the borrowed
 * portion of the notional, so a losing outcome returns 0 — the margin is gone.
 */
export function payoutAtResolution(position: Position, outcome: Outcome): number {
  if (outcome !== position.side) return 0;
  const notional = notionalFor(position.margin, position.leverage);
  const borrowed = notional - position.margin;
  return sharesFor(position) - borrowed;
}
