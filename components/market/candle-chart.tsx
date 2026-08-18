"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
} from "lightweight-charts";

import type { Candle } from "@/lib/data/mock/candles";

/**
 * TradingView candlestick chart.
 *
 * Uses lightweight-charts (Apache-2.0), TradingView's own library, so this is
 * literally their renderer rather than a lookalike. It draws to canvas, so it is
 * styled with resolved colour values read off the document at mount.
 *
 * Overrides the design system's charting choice (Bklit/visx) for this surface
 * only, because "exactly like TradingView" is the requirement.
 *
 * ## Two effects, deliberately
 *
 * Building the chart is expensive; moving a price line is not. The entry and
 * liquidation lines change on every drag of the leverage slider, so they are
 * updated in place in a SECOND effect. Putting them in the build effect would
 * tear down and recreate the whole chart on every pixel of slider movement.
 */
export function CandleChart({
  candles,
  liquidationPrice,
  entryPrice,
}: {
  candles: Candle[];
  /** Redrawn live as the trader adjusts size or leverage. */
  liquidationPrice?: number | null;
  entryPrice?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const liqLineRef = useRef<IPriceLine | null>(null);
  const entryLineRef = useRef<IPriceLine | null>(null);
  const colorsRef = useRef({ faint: "#9398a3", warn: "#f2a618" });

  /**
   * Bumped when the chart is (re)built so the price-line effect re-attaches to
   * the new series. Without it, rebuilding the chart would silently orphan the
   * lines — they'd vanish and never come back.
   */
  const [chartEpoch, setChartEpoch] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Canvas can't read CSS variables, so resolve them once from the document.
    //
    // Read the --chart-* mirrors, NOT the oklch() tokens: Lightning CSS rewrites
    // those to lab(...) at build time, and lightweight-charts' parser rejects it
    // with "Failed to parse color", which took down the entire page.
    const css = getComputedStyle(document.documentElement);

    /** Only trusts hex or rgb(); anything else falls back rather than throwing. */
    const token = (name: string, fallback: string) => {
      const value = css.getPropertyValue(name).trim();
      return /^#[0-9a-f]{3,8}$/i.test(value) || /^rgba?\(/i.test(value)
        ? value
        : fallback;
    };

    const ground = token("--chart-bg", "#272a30");
    const faint = token("--chart-text", "#9398a3");
    const hairline = token("--chart-grid", "#3a3d44");
    const long = token("--chart-up", "#3fc168");
    const short = token("--chart-down", "#fd736d");
    const warn = token("--chart-warn", "#f2a618");
    colorsRef.current = { faint, warn };

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: ground },
        textColor: faint,
        attributionLogo: false,
      },
      grid: {
        // Hairlines one shade off the surface, solid — never dashed.
        vertLines: { color: hairline, style: LineStyle.Solid },
        horzLines: { color: hairline, style: LineStyle.Solid },
      },
      rightPriceScale: { borderColor: hairline },
      timeScale: { borderColor: hairline, timeVisible: false },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: faint, labelBackgroundColor: ground },
        horzLine: { color: faint, labelBackgroundColor: ground },
      },
      autoSize: true,
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: long,
      downColor: short,
      borderUpColor: long,
      borderDownColor: short,
      wickUpColor: long,
      wickDownColor: short,
      priceFormat: { type: "price", precision: 3, minMove: 0.001 },
    });
    candleSeries.setData(candles);
    seriesRef.current = candleSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    // Pin volume to the bottom fifth so it never competes with price.
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeSeries.setData(
      candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? `${long}55` : `${short}55`,
      })),
    );

    chart.timeScale().fitContent();
    setChartEpoch((n) => n + 1);

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      // Owned by the destroyed series — dropping the refs avoids calling
      // removePriceLine on a disposed chart.
      liqLineRef.current = null;
      entryLineRef.current = null;
    };
  }, [candles]);

  // Price lines: created once, then moved in place. No animation — dragging the
  // leverage slider is a 100+/day action and the frequency gate disqualifies it.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const { faint, warn } = colorsRef.current;

    const sync = (
      ref: React.MutableRefObject<IPriceLine | null>,
      price: number | null | undefined,
      options: { color: string; title: string; lineWidth: 1 | 2 },
    ) => {
      if (price == null || !Number.isFinite(price)) {
        if (ref.current) {
          series.removePriceLine(ref.current);
          ref.current = null;
        }
        return;
      }
      if (ref.current) {
        ref.current.applyOptions({ price });
        return;
      }
      ref.current = series.createPriceLine({
        price,
        color: options.color,
        lineWidth: options.lineWidth,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: options.title,
      });
    };

    sync(entryLineRef, entryPrice, {
      color: faint,
      title: "entry",
      lineWidth: 1,
    });
    // Heavier and amber: this is the line that decides whether someone loses
    // everything, so it must not read as one more grid line.
    sync(liqLineRef, liquidationPrice, {
      color: warn,
      title: "liq.",
      lineWidth: 2,
    });
  }, [liquidationPrice, entryPrice, chartEpoch]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="img"
      aria-label={
        liquidationPrice != null
          ? `Daily price candles. ${candles.length} bars ending at ${candles[candles.length - 1]?.close}. Liquidation price marked at ${liquidationPrice.toFixed(3)}.`
          : `Daily price candles. ${candles.length} bars ending at ${candles[candles.length - 1]?.close}.`
      }
    />
  );
}
