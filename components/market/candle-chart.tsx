"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  createChart,
  type IChartApi,
} from "lightweight-charts";

import type { Candle } from "@/lib/data/mock/candles";

/**
 * TradingView candlestick chart.
 *
 * Uses lightweight-charts (Apache-2.0), TradingView's own library, so this is
 * literally their renderer rather than a lookalike. It draws to canvas, so it is
 * styled with resolved colour values read off the document at mount — CSS custom
 * properties can't reach inside a canvas.
 *
 * Overrides the design system's charting choice (Bklit/visx) for this surface
 * only, because "exactly like TradingView" is the requirement.
 */
export function CandleChart({
  candles,
  liquidationPrice,
  entryPrice,
}: {
  candles: Candle[];
  /** Drawn as a horizontal marker when a position is being previewed. */
  liquidationPrice?: number | null;
  entryPrice?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

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

    if (entryPrice != null) {
      candleSeries.createPriceLine({
        price: entryPrice,
        color: faint,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: "entry",
      });
    }

    if (liquidationPrice != null) {
      candleSeries.createPriceLine({
        price: liquidationPrice,
        color: warn,
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: "liq.",
      });
    }

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, liquidationPrice, entryPrice]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="img"
      aria-label={`Daily price candles. ${candles.length} bars ending at ${candles[candles.length - 1]?.close}.`}
    />
  );
}
