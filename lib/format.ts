/**
 * Shared display formatting.
 *
 * Money and probability never render as raw floats — every price, percentage and
 * volume in the UI goes through here so they stay consistent across screens.
 * See CLAUDE.md "Architecture rules" #3.
 *
 * All formatters pin locale and time zone explicitly. Relying on the runtime's
 * defaults makes server and client disagree, which surfaces as a hydration
 * mismatch that only reproduces in some time zones.
 */

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

const monthDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const monthDayYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * A probability in [0, 1] as a whole percentage.
 *
 * Near-certain markets are clamped to "<1%" / ">99%" rather than rounding to a
 * flat 0% or 100% — a market that still accepts trades has not resolved, and
 * showing "0%" on a tradeable market misrepresents it.
 */
export function formatProbability(probability: number): string {
  if (!Number.isFinite(probability)) return "—";
  const clamped = Math.min(Math.max(probability, 0), 1);
  if (clamped > 0 && clamped < 0.01) return "<1%";
  if (clamped < 1 && clamped >= 0.99) return ">99%";
  return `${Math.round(clamped * 100)}%`;
}

/** A probability in [0, 1] as a two-decimal price, e.g. 0.6421 -> "0.64". */
export function formatPrice(probability: number): string {
  if (!Number.isFinite(probability)) return "—";
  return Math.min(Math.max(probability, 0), 1).toFixed(2);
}

/** USD volume in compact form, e.g. 8_420_000 -> "$8.42M". */
export function formatUsdCompact(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return compactUsd.format(amount);
}

/**
 * A market close date. Omits the year when it falls in the current year, since
 * that is the common case and the year is noise.
 *
 * Only safe in server-rendered output — it reads the current date, so rendering
 * it on both server and client across a year boundary could disagree.
 */
export function formatCloseDate(iso: string | null): string {
  // Null is a real answer here: not every source publishes a close date, and a
  // dash is honest where an invented date would not be.
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const isThisYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return (isThisYear ? monthDay : monthDayYear).format(date);
}

/**
 * Payout multiplier for one share, e.g. 0.66 -> "1.52×".
 *
 * What a winning dollar returns in total (stake included), which is what
 * exchanges show beside each outcome. It is simply 1 / price, because a share
 * pays exactly 1 if its side resolves true.
 */
export function formatMultiplier(probability: number): string {
  if (!Number.isFinite(probability) || probability <= 0) return "—";
  const clamped = Math.min(Math.max(probability, 0.0001), 1);
  return `${(1 / clamped).toFixed(2)}×`;
}
