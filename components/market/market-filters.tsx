import Link from "next/link";

import { MARKET_CATEGORIES, type MarketCategory, type MarketSort } from "@/lib/data/clients";

const SORT_OPTIONS: { value: MarketSort; label: string }[] = [
  { value: "active", label: "Most active (24h)" },
  { value: "competitive", label: "Most competitive" },
  { value: "volume", label: "Highest volume" },
  { value: "closing", label: "Closing soonest" },
];

const VOLUME_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "Any volume" },
  { value: "1000", label: "$1k+ traded" },
  { value: "10000", label: "$10k+ traded" },
  { value: "100000", label: "$100k+ traded" },
];

const FIELD = "h-8 rounded-sm border border-border bg-background px-2 text-xs text-foreground";
const LABEL = "mb-1 block text-[11px] text-faint";

/**
 * A plain GET form, deliberately. Search and filtering run on the server against
 * the in-memory catalogue, so this needs no client JavaScript and no "use client"
 * — submitting navigates to the same page with new query params.
 */
export function MarketFilters({
  search,
  category,
  sort,
  minVolume,
}: {
  search: string;
  category: MarketCategory | "";
  sort: MarketSort;
  minVolume: number;
}) {
  return (
    <form
      method="GET"
      action="/"
      className="flex flex-wrap items-end gap-2 border-b border-hairline pb-4"
    >
      <div className="min-w-[200px] grow sm:grow-0 sm:basis-80">
        {/* Visible label, never placeholder-as-label. */}
        <label htmlFor="q" className={LABEL}>
          Search markets
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={search}
          autoComplete="off"
          className={`${FIELD} w-full`}
        />
      </div>

      <div>
        <label htmlFor="category" className={LABEL}>
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={category}
          className={FIELD}
        >
          <option value="">All categories</option>
          {MARKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sort" className={LABEL}>
          Sort
        </label>
        <select id="sort" name="sort" defaultValue={sort} className={FIELD}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="min" className={LABEL}>
          Liquidity
        </label>
        <select
          id="min"
          name="min"
          defaultValue={String(minVolume)}
          className={FIELD}
        >
          {VOLUME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="h-8 rounded-sm border border-border px-3 text-xs text-foreground transition-colors hover:bg-raised"
      >
        Apply
      </button>

      {(search || category || sort !== "active" || minVolume > 0) && (
        <Link
          href="/"
          className="h-8 rounded-sm px-2 text-xs leading-8 text-muted transition-colors hover:text-foreground"
        >
          Reset
        </Link>
      )}
    </form>
  );
}
