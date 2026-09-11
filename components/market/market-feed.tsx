"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Market, MarketCategory, MarketSort, PricePoint } from "@/lib/data/clients";
import { MarketGrid } from "@/components/market/market-grid";

type Query = {
  search: string;
  category: MarketCategory | "";
  sort: MarketSort;
};

/**
 * The browse grid, extended as the reader scrolls.
 *
 * Progressive enhancement, not a rewrite: the server still renders the first
 * page, so the markets are in the HTML and the screen is useful with no
 * JavaScript at all. This component only ever APPENDS to what arrived.
 *
 * A "Load more" button sits under the sentinel and is the real control — the
 * observer just presses it for you. Infinite scroll alone strands keyboard and
 * screen-reader users, who have no way to ask for the next page, so the button
 * is not a fallback here, it is the primary affordance.
 */
export function MarketFeed({
  initialMarkets,
  initialHistories,
  total,
  pageSize,
  query,
}: {
  initialMarkets: Market[];
  initialHistories: Record<string, PricePoint[]>;
  total: number;
  pageSize: number;
  query: Query;
}) {
  const [markets, setMarkets] = useState(initialMarkets);
  const [histories, setHistories] =
    useState<Record<string, PricePoint[]>>(initialHistories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  /*
   * Appended state is discarded when the query changes by REMOUNTING: the
   * parent keys this component on the query. Holding 60 appended Sports
   * markets while the reader filters to Crypto would show the wrong thing, and
   * a remount is the one reset that cannot get out of step with the props.
   */
  const done = markets.length >= total;

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    setError(undefined);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(markets.length),
      });
      if (query.search) params.set("q", query.search);
      if (query.category) params.set("category", query.category);
      if (query.sort !== "active") params.set("sort", query.sort);

      const res = await fetch(`/api/markets?${params}`);
      const body = (await res.json()) as {
        markets?: Market[];
        histories?: Record<string, PricePoint[]>;
        error?: string;
      };
      if (!res.ok || !body.markets) throw new Error(body.error ?? "Request failed.");

      setMarkets((current) => {
        // The catalogue can rebuild between requests, so an id could repeat.
        // Duplicate React keys would break rendering; filtering is cheap.
        const seen = new Set(current.map((m) => m.id));
        return [...current, ...body.markets!.filter((m) => !seen.has(m.id))];
      });
      setHistories((current) => ({ ...current, ...(body.histories ?? {}) }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [loading, done, markets.length, pageSize, query]);

  // Fires the load when the sentinel comes near the viewport. rootMargin means
  // the next page is already arriving before the reader hits the bottom.
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || done) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, done]);

  const historyMap = new Map(Object.entries(histories));

  return (
    <>
      <MarketGrid markets={markets} histories={historyMap} />

      {/* Live region: without it, appended cards are silent to a screen reader,
          which is the standard failure of an infinite feed. */}
      <p aria-live="polite" className="sr-only">
        Showing {markets.length} of {total} markets
      </p>

      <div ref={sentinel} className="mt-6 flex flex-col items-center gap-2">
        {error && <p className="text-xs text-short">{error}</p>}

        {done ? (
          <p className="text-xs text-faint">
            <span className="numeric">{markets.length}</span> of{" "}
            <span className="numeric">{total}</span> — that&apos;s everything
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loading}
              className="control px-4 py-2 text-xs"
            >
              {loading ? "Loading…" : "Load more"}
            </button>
            <p className="numeric text-[11px] text-faint">
              {markets.length} of {total}
            </p>
          </>
        )}
      </div>
    </>
  );
}
