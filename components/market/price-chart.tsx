"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type { PricePoint } from "@/lib/data/mock/price-history";
import { formatCloseDate, formatProbability } from "@/lib/format";

const VIEW_W = 300;
const VIEW_H = 72;

/**
 * Minimum vertical domain, in probability points.
 *
 * A sparkline auto-scaled to its own min/max turns a 0.4-point wobble into a
 * dramatic swing. Forcing a floor on the domain keeps a quiet market looking
 * quiet — the chart should not overstate movement in a product where people size
 * positions off it.
 */
const MIN_DOMAIN = 0.08;

type Props = {
  points: PricePoint[];
  /** Used in the accessible summary so the series is identifiable. */
  label: string;
};

/**
 * Price history sparkline with a hover/focus crosshair.
 *
 * Single series, so no legend — the card names it. Colour follows direction over
 * the window (up = long, down = short) and is always paired with a +/- delta and
 * an arrow glyph, so colour is never the only signal.
 *
 * The crosshair snaps to the nearest date: readers aim at a point in time, not at
 * a 2px line. The whole plot is the hit target, well over the 24px minimum.
 *
 * Keyboard gets exactly what hover gets — arrow keys walk the series, Home/End
 * jump to the ends, and the reading is announced politely.
 */
export function PriceChart({ points, label }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const geometry = useMemo(() => {
    const prices = points.map((p) => p.price);
    let lo = Math.min(...prices);
    let hi = Math.max(...prices);

    if (hi - lo < MIN_DOMAIN) {
      const mid = (hi + lo) / 2;
      lo = mid - MIN_DOMAIN / 2;
      hi = mid + MIN_DOMAIN / 2;
    }
    const pad = (hi - lo) * 0.12;
    lo = Math.max(0, lo - pad);
    hi = Math.min(1, hi + pad);
    const span = hi - lo || 1;

    const xy = points.map((p, i) => ({
      x: (i / (points.length - 1)) * VIEW_W,
      y: VIEW_H - ((p.price - lo) / span) * VIEW_H,
    }));

    const line = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
    const area = `${line} L${VIEW_W} ${VIEW_H} L0 ${VIEW_H} Z`;

    return { xy, line, area };
  }, [points]);

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.price - first.price;
  const rising = delta >= 0;
  const stroke = rising ? "var(--long)" : "var(--short)";

  const active = activeIndex === null ? null : points[activeIndex];
  const activeXY = activeIndex === null ? null : geometry.xy[activeIndex];

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
      const last = points.length - 1;
      const current = activeIndex ?? last;
      let next: number | null = null;

      if (event.key === "ArrowLeft") next = Math.max(0, current - 1);
      else if (event.key === "ArrowRight") next = Math.min(last, current + 1);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = last;
      else if (event.key === "Escape") next = null;
      else return;

      event.preventDefault();
      setActiveIndex(next);
    },
    [activeIndex, points.length],
  );

  const summary = `${label}. 30-day history from ${formatProbability(first.price)} on ${formatCloseDate(first.date)} to ${formatProbability(last.price)} on ${formatCloseDate(last.date)}.`;

  return (
    <div className="relative">
      <div
        tabIndex={0}
        role="img"
        aria-label={summary}
        onKeyDown={onKeyDown}
        onBlur={() => setActiveIndex(null)}
        onPointerMove={(e) => setActiveIndex(indexFromClientX(e.clientX))}
        onPointerLeave={() => setActiveIndex(null)}
        className="rounded-sm"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="h-18 w-full touch-none"
          aria-hidden
        >
          <defs>
            <linearGradient
              id={`fill-${rising ? "up" : "down"}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={geometry.area} fill={`url(#fill-${rising ? "up" : "down"})`} />
          {/* non-scaling-stroke keeps the line 2px despite the stretched viewBox */}
          <path
            d={geometry.line}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {activeXY && (
            <g>
              <line
                x1={activeXY.x}
                y1={0}
                x2={activeXY.x}
                y2={VIEW_H}
                stroke="var(--rim)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              {/* 2px surface ring so the marker reads against the fill */}
              <circle
                cx={activeXY.x}
                cy={activeXY.y}
                r={4}
                fill={stroke}
                stroke="var(--ground)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Endpoint labels: the tooltip enhances, it never gates. The range is
          readable without hovering, and the current value is printed on the card. */}
      <div className="mt-1 flex items-center justify-between text-[10px] text-faint">
        <span>{formatCloseDate(first.date)}</span>
        <span className={rising ? "text-long" : "text-short"}>
          <span aria-hidden>{rising ? "▲" : "▼"}</span>{" "}
          <span className="numeric">
            {rising ? "+" : "−"}
            {Math.abs(delta * 100).toFixed(1)}
          </span>{" "}
          pts / 30d
        </span>
        <span>{formatCloseDate(last.date)}</span>
      </div>

      {active && (
        <div
          className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded-sm border border-rim bg-panel px-2 py-1 text-center whitespace-nowrap"
          role="status"
        >
          {/* Value leads, label follows — the reader has the series and wants
              the number. */}
          <span className="numeric block text-xs text-foreground">
            {formatProbability(active.price)}
          </span>
          <span className="block text-[10px] text-faint">
            {formatCloseDate(active.date)}
          </span>
        </div>
      )}
    </div>
  );
}
