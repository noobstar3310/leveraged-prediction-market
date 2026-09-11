import {
  MARKET_SORTS,
  MarketDataError,
  type MarketCategory,
  type MarketPage,
  type MarketSort,
  type PricePoint,
} from "@/lib/data/clients";
import { getMarketsClient } from "@/lib/data";
import {
  MarketSearch,
  MarketToolbar,
} from "@/components/market/market-toolbar";
import { MarketFeed } from "@/components/market/market-feed";

/**
 * One full grid: three across on desktop, four rows.
 *
 * Was 6, chosen when the catalogue was 76 fabricated markets. Against 600 live
 * ones that showed 1% of the data with no way to reach the rest — the page
 * literally read "6 of 600" and offered no next link.
 */
const PAGE_SIZE = 12;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parseSort(value: string): MarketSort {
  return (MARKET_SORTS as readonly string[]).includes(value)
    ? (value as MarketSort)
    : "active";
}

/**
 * Categories are data now, so an unknown value can't be rejected up front — it
 * is simply passed through and matches nothing, which the empty state handles.
 * Length-capped so a hostile query string can't bloat the rendered markup.
 */
function parseCategory(value: string): MarketCategory | "" {
  return value.slice(0, 60);
}

export default async function MarketsPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const search = first(params.q).slice(0, 100);
  const category = parseCategory(first(params.category));
  const sort = parseSort(first(params.sort));

  let page: MarketPage | null = null;
  let histories = new Map<string, PricePoint[]>();
  let errorMessage: string | null = null;

  try {
    const client = await getMarketsClient();
    const result = await client.listMarkets({
      search,
      category: category || undefined,
      sort,
      limit: PAGE_SIZE,
    });
    page = result;
    // Sparklines come through the seam, batched for the whole page. Cards used
    // to reach into the mock generator themselves, which meant the grid could
    // never render anything but fabricated history.
    histories = await client.getHistories(result.markets);
  } catch (error) {
    // A blank grid reads to a user as "no markets exist" rather than "the
    // request failed", so failures always render an explicit error state.
    errorMessage =
      error instanceof MarketDataError
        ? error.message
        : "Something went wrong loading markets.";
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Markets
        </h1>
        <MarketSearch search={search} category={category} sort={sort} />
      </header>

      <div className="mb-6">
        <MarketToolbar
          search={search}
          category={category}
          sort={sort}
          categories={page?.categories ?? []}
        />
      </div>

      {page && page.markets.length > 0 && (
        <p className="mb-4 text-xs text-faint">
          <span className="numeric">{page.totalMatching}</span>{" "}
          {search || category ? "matching markets" : "markets"}
        </p>
      )}

      {errorMessage ? (
        <ErrorState message={errorMessage} />
      ) : !page || page.markets.length === 0 ? (
        <EmptyState search={search} />
      ) : (
        <MarketFeed
          // Remounts on any query change, discarding everything appended under
          // the previous filter.
          key={`${search}|${category}|${sort}`}
          initialMarkets={page.markets}
          // A Map does not survive the server/client boundary; the feed rebuilds
          // one on the other side.
          initialHistories={Object.fromEntries(histories)}
          total={page.totalMatching}
          pageSize={PAGE_SIZE}
          query={{ search, category, sort }}
        />
      )}
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="panel px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">
        Couldn&apos;t load markets
      </p>
      <p className="mx-auto mt-2 max-w-md text-xs text-muted">{message}</p>
      {/* Deliberately a plain anchor rather than next/link. A retry has to
          re-run the failed request, and client-side navigation to the route we
          are already on can be served from the router cache without ever
          hitting the server. A full document load is the behaviour we want. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="control mt-6 inline-block px-4 py-2 text-xs">
        Try again
      </a>
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="panel px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">
        {search ? "No markets match that search" : "No markets in this category"}
      </p>
      <p className="mx-auto mt-2 max-w-md text-xs text-muted">
        {search
          ? "Try a shorter phrase, or switch back to All."
          : "Switch to All to see everything."}
      </p>
    </div>
  );
}
