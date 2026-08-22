import Link from "next/link";
import { Search } from "lucide-react";

import {
  MARKET_SORTS,
  type MarketCategory,
  type MarketSort,
} from "@/lib/data/clients";

const SORT_LABEL: Record<MarketSort, string> = {
  active: "Active",
  competitive: "Competitive",
  volume: "Volume",
  closing: "Closing",
};

type State = {
  search: string;
  category: MarketCategory | "";
  sort: MarketSort;
};

/** Builds a browse URL, omitting defaults so the address bar stays clean. */
function href({ search, category, sort }: State): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (category) params.set("category", category);
  if (sort !== "active") params.set("sort", sort);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

const TAB =
  "-mb-px border-b-2 px-3 py-2 text-xs whitespace-nowrap transition-colors";
const TAB_ON = "border-foreground text-foreground";
const TAB_OFF = "border-transparent text-muted hover:text-foreground";

/**
 * Search box for the page header.
 *
 * A plain GET form — filtering runs on the server, so this needs no client
 * JavaScript. The current category and sort ride along as hidden inputs so
 * searching doesn't silently reset them.
 */
export function MarketSearch({ search, category, sort }: State) {
  return (
    <form method="GET" action="/" className="relative w-full sm:w-72">
      {category && <input type="hidden" name="category" value={category} />}
      {sort !== "active" && <input type="hidden" name="sort" value={sort} />}
      <label htmlFor="q" className="sr-only">
        Search markets
      </label>
      <Search
        aria-hidden
        size={14}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint"
      />
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={search}
        autoComplete="off"
        placeholder="Search"
        className="well-field h-9 w-full pl-9 text-xs"
      />
    </form>
  );
}

/**
 * Category and sort, both as links rather than selects.
 *
 * Links mean no form, no submit button and no client JavaScript — one tap
 * filters. Sort gets the same treatment because four options as links read
 * better than a select that needs an Apply button beside it.
 */
export function MarketToolbar({
  search,
  category,
  sort,
  categories,
}: State & {
  /**
   * The categories actually present in the catalogue.
   *
   * Passed in rather than imported from a constant: the source decides what
   * exists, and a tab that filters to zero markets every time is worse than no
   * tab at all.
   */
  categories: MarketCategory[];
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-hairline">
      <nav aria-label="Category" className="flex items-center overflow-x-auto">
        <Link
          href={href({ search, category: "", sort })}
          aria-current={category === "" ? "page" : undefined}
          className={`${TAB} ${category === "" ? TAB_ON : TAB_OFF}`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={href({ search, category: c, sort })}
            aria-current={category === c ? "page" : undefined}
            className={`${TAB} ${category === c ? TAB_ON : TAB_OFF}`}
          >
            {c}
          </Link>
        ))}
      </nav>

      <nav aria-label="Sort" className="flex items-center gap-1 pb-1.5">
        <span className="mr-1 text-[10px] tracking-wide text-faint uppercase">
          Sort
        </span>
        {MARKET_SORTS.map((s) => (
          <Link
            key={s}
            href={href({ search, category, sort: s })}
            aria-current={sort === s ? "page" : undefined}
            className={
              sort === s
                ? "rounded-sm px-2 py-1 text-[11px] text-foreground"
                : "rounded-sm px-2 py-1 text-[11px] text-faint transition-colors hover:text-foreground"
            }
          >
            {SORT_LABEL[s]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
