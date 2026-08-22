"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type { PricePoint } from "@/lib/data/mock/price-history";
import { formatCloseDate, formatProbability } from "@/lib/format";

const VIEW_W = 300;
const VIEW_H = 96;

/**
 * Minimum vertical domain, in probability points.
 *
 * A sparkline auto-scaled to its own min/max turns a 0.4-point wobble into a
 * dramatic swing. Flooring the domain keeps a quiet market looking quiet — the
 * chart must not overstate movement in a product where people size positions
 * off it.
 */
const MIN_DOMAIN = 0.1;

type Props = {
  points: PricePoint[];
  /** Used in the accessible summary so the series is identifiable. */
  label: string;
};

/**
 * Round, human gridline levels inside a domain — 5% steps, at most four.
 *
 * `EDGE_MARGIN` drops any level that would render hard against the frame. The
 * axis labels are absolutely positioned with -translate-y-1/2 inside an
 * overflow-hidden box, so a level sitting exactly on the domain boundary has
 * its label sliced in half. Real market data hits this constantly: a binary
 * market's two series are complements, so the domain lands on round numbers
 * (0.25/0.75 pads to exactly 0.20/0.80) and `Math.ceil(lo / step) * step`
 * returns `lo` itself.
 */
const EDGE_MARGIN = 0.06;

function gridLevels(lo: number, hi: number): number[] {
  const stepChoices = [0.05, 0.1, 0.2, 0.25];
  const span = hi - lo;
  const step = stepChoices.find((s) => span / s <= 4) ?? 0.25;
  const divisor = span || 1;
  const levels: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v < hi; v += step) {
    const fraction = (v - lo) / divisor;
    if (fraction < EDGE_MARGIN || fraction > 1 - EDGE_MARGIN) continue;
    levels.push(Number(v.toFixed(4)));
  }
  return levels;
}

/**
 * Price history for both outcomes, with a hover/focus crosshair.
 *
 * Two series — YES and NO — because a binary market has two prices and a trader
 * picks between them. They are exact complements, so the pair reads as a spread
 * opening and closing rather than one line wandering.
 *
 * No legend: the Yes/No rows directly beneath the chart carry the same colours
 * and the same values, so identity is already established. A separate legend
 * would be the third place on one card saying the same thing.
 *
 * The crosshair snaps to the nearest day rather than interpolating — readers aim
 * at a date, and a value between two days was never real. Smoothness comes from
 * density (90 points), not from inventing intermediate numbers.
 */
export function PriceChart({ points, label }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const geometry = useMemo(() => {
    // Domain spans BOTH series. They are complements, so this is symmetric
    // about 0.5 and a lopsided market legitimately shows two distant lines.
    const yes = points.map((p) => p.price);
    const all = [...yes, ...yes.map((v) => 1 - v)];
    let lo = Math.min(...all);
    let hi = Math.max(...all);

    if (hi - lo < MIN_DOMAIN) {
      const mid = (hi + lo) / 2;
      lo = mid - MIN_DOMAIN / 2;
      hi = mid + MIN_DOMAIN / 2;
    }
    const pad = (hi - lo) * 0.1;
    lo = Math.max(0, lo - pad);
    hi = Math.min(1, hi + pad);
    const span = hi - lo || 1;

    const toY = (v: number) => VIEW_H - ((v - lo) / span) * VIEW_H;
    const toX = (i: number) => (i / (points.length - 1)) * VIEW_W;

    const path = (values: number[]) =>
      values
        .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(2)} ${toY(v).toFixed(2)}`)
        .join(" ");

    return {
      lo,
      hi,
      toX,
      toY,
      yesPath: path(yes),
      noPath: path(yes.map((v) => 1 - v)),
      levels: gridLevels(lo, hi),
    };
  }, [points]);

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.price - first.price;
  const rising = delta >= 0;

  const active = activeIndex === null ? null : points[activeIndex];
  const activeX = activeIndex === null ? null : geometry.toX(activeIndex);

  const indexFromClientX = useCallback(
    (clientX: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return null;
      const ratio = (clientX - rect.left) / rect.width;
      const i = Math.round(ratio * (points.length - 1));
      return Math.min(Math.max(i, 0), points.length - 1);
    },
    [points.length],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const end = points.length - 1;
      const current = activeIndex ?? end;
      let next: number | null = null;
      if (event.key === "ArrowLeft") next = Math.max(0, current - 1);
      else if (event.key === "ArrowRight") next = Math.min(end, current + 1);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = end;
      else if (event.key === "Escape") next = null;
      else return;
      event.preventDefault();
      setActiveIndex(next);
    },
    [activeIndex, points.length],
  );

  const summary = `${label}. 90-day history. Yes from ${formatProbability(first.price)} on ${formatCloseDate(first.date)} to ${formatProbability(last.price)} on ${formatCloseDate(last.date)}.`;

  // Percent coordinates so HTML labels overlay the stretched SVG exactly.
  const pctX = activeX === null ? 0 : (activeX / VIEW_W) * 100;
  const yesPctY = active === null ? 0 : (geometry.toY(active.price) / VIEW_H) * 100;
  const noPctY = active === null ? 0 : (geometry.toY(1 - active.price) / VIEW_H) * 100;
  /**
   * Horizontal anchoring, three-way rather than a binary flip: labels near
   * either edge would otherwise hang off the card. Near the left they anchor
   * left, near the right they anchor right, and in between they centre.
   */
  const anchor: "start" | "middle" | "end" =
    pctX < 18 ? "start" : pctX > 82 ? "end" : "middle";
  const flip = pctX > 62;

  return (
    <div className="relative">
      {/* Reserved band for the crosshair date.
          The label used to be positioned above the plot with translateY(-100%),
          which pushed it out of the component entirely and over the market
          question. It now has its own row, always present so hovering causes no
          layout shift, and it cannot escape upward. */}
      <div aria-hidden className="relative h-4">
        {active && (
          <span
            className="numeric absolute top-0 rounded-sm px-1 text-[10px] whitespace-nowrap text-muted"
            style={{
              left: `${pctX}%`,
              transform:
                anchor === "start"
                  ? "translateX(0)"
                  : anchor === "end"
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            {formatCloseDate(active.date)}
          </span>
        )}
      </div>

      <div
        tabIndex={0}
        role="img"
        aria-label={summary}
        onKeyDown={onKeyDown}
        onBlur={() => setActiveIndex(null)}
        onPointerMove={(e) => setActiveIndex(indexFromClientX(e.clientX))}
        onPointerLeave={() => setActiveIndex(null)}
        className="relative overflow-hidden rounded-sm"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="h-24 w-full touch-none"
          aria-hidden
        >
          {/* Recessive dotted grid, one shade off the surface — never competing
              with the data, never dashed in a way that reads as a threshold. */}
          {geometry.levels.map((v) => (
            <line
              key={v}
              x1={0}
              x2={VIEW_W}
              y1={geometry.toY(v)}
              y2={geometry.toY(v)}
              stroke="var(--hairline)"
              strokeWidth={1}
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path
            d={geometry.noPath}
            fill="none"
            stroke="var(--short)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={geometry.yesPath}
            fill="none"
            stroke="var(--long)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {activeX !== null && active && (
            <g>
              <line
                x1={activeX}
                x2={activeX}
                y1={0}
                y2={VIEW_H}
                stroke="var(--faint)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              {/* Surface ring so each dot reads against its own line. */}
              <circle
                cx={activeX}
                cy={geometry.toY(1 - active.price)}
                r={3.5}
                fill="var(--short)"
                stroke="var(--surface)"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={activeX}
                cy={geometry.toY(active.price)}
                r={3.5}
                fill="var(--long)"
                stroke="var(--surface)"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </svg>

        {/* Axis labels sit outside the SVG so they never scale with it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
        >
          {geometry.levels.map((v) => (
            <span
              key={v}
              className="numeric absolute right-0 -translate-y-1/2 bg-surface pl-1 text-[9px] text-faint"
              style={{ top: `${(geometry.toY(v) / VIEW_H) * 100}%` }}
            >
              {Math.round(v * 100)}%
            </span>
          ))}

          {active && (
            <>
              <ValueChip
                pctX={pctX}
                pctY={yesPctY}
                flip={flip}
                tone="long"
                text={`Yes ${formatProbability(active.price)}`}
              />
              <ValueChip
                pctX={pctX}
                pctY={noPctY}
                flip={flip}
                tone="short"
                text={`No ${formatProbability(1 - active.price)}`}
              />
            </>
          )}
        </div>
      </div>

      {/* Endpoints and the change: the tooltip enhances, it never gates. */}
      <div className="mt-1 flex items-center justify-between text-[10px] text-faint">
        <span>{formatCloseDate(first.date)}</span>
        <span className={rising ? "text-long" : "text-short"}>
          <span aria-hidden>{rising ? "▲" : "▼"}</span>{" "}
          <span className="numeric">
            {rising ? "+" : "−"}
            {Math.abs(delta * 100).toFixed(1)}
          </span>{" "}
          pts / 90d
        </span>
        <span>{formatCloseDate(last.date)}</span>
      </div>
    </div>
  );
}

function ValueChip({
  pctX,
  pctY,
  flip,
  tone,
  text,
}: {
  pctX: number;
  pctY: number;
  flip: boolean;
  tone: "long" | "short";
  text: string;
}) {
  // Written out, not interpolated: Tailwind scans source text, so a
  // `text-${tone}` template literal produces no class at all.
  const toneClass = tone === "long" ? "text-long" : "text-short";
  return (
    <span
      className={`numeric absolute rounded-sm bg-surface px-1 text-[9px] whitespace-nowrap ${toneClass}`}
      style={{
        left: `${pctX}%`,
        top: `${pctY}%`,
        transform: `translate(${flip ? "calc(-100% - 6px)" : "6px"}, -50%)`,
      }}
    >
      {text}
    </span>
  );
}
