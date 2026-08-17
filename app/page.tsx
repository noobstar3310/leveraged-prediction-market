import {
  MARKET_CATEGORIES,
  MARKET_SORTS,
  MarketDataError,
  type MarketCategory,
  type MarketPage,
  type MarketSort,
} from "@/lib/data/clients";
import { mockMarketsClient } from "@/lib/data/mock";
import { MarketFilters } from "@/components/market/market-filters";
import { MarketGrid } from "@/components/market/market-grid";

/** How many cards we render at once. */
const PAGE_SIZE = 60;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parseSort(value: string): MarketSort {
  return (MARKET_SORTS as readonly string[]).includes(value)
    ? (value as MarketSort)
    : "active";
}

function parseCategory(value: string): MarketCategory | "" {
  return (MARKET_CATEGORIES as readonly string[]).includes(value)
    ? (value as MarketCategory)
    : "";
}

function parseMinVolume(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default async function MarketsPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const search = first(params.q).slice(0, 100);
  const category = parseCategory(first(params.category));
  const sort = parseSort(first(params.sort));
  const minVolume = parseMinVolume(first(params.min));

  let page: MarketPage | null = null;
  let errorMessage: string | null = null;

  try {
    page = await mockMarketsClient.listMarkets({
      search,
      category: category || undefined,
      sort,
      minVolume,
      limit: PAGE_SIZE,
    });
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
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-lg font-medium text-foreground">Markets</h1>
        {page && <ResultSummary page={page} search={search} />}
      </header>

      {page?.isMockData && <MockDataNotice />}

      <div className="mb-6">
        <MarketFilters
          search={search}
          category={category}
          sort={sort}
          minVolume={minVolume}
        />
      </div>

      {errorMessage ? (
        <ErrorState message={errorMessage} />
      ) : !page || page.markets.length === 0 ? (
        <EmptyState search={search} />
      ) : (
        <MarketGrid markets={page.markets} />
      )}
    </main>
  );
}

/**
 * Required while the mock adapter is in use. The design system forbids showing
 * invented figures as though they were real, and every price, volume and date on
 * this screen is fabricated. Disappears on its own once a real adapter reports
 * isMockData: false.
 */
function MockDataNotice() {
  return (
    <p className="mb-4 rounded-sm border border-warn/40 px-3 py-2 text-xs text-warn">
      Demo data — every market, price and volume on this page is fabricated. No
      real market is being quoted.
    </p>
  );
}

function ResultSummary({ page, search }: { page: MarketPage; search: string }) {
  return (
    <p className="text-xs text-faint">
      Showing <span className="numeric">{page.markets.length}</span> of{" "}
      <span className="numeric">
        {page.totalMatching.toLocaleString("en-US")}
      </span>{" "}
      {search ? "matches" : "markets"}
    </p>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-hairline bg-surface px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">
        Couldn&apos;t load markets
      </p>
      <p className="mx-auto mt-2 max-w-md text-xs text-muted">{message}</p>
      {/* Deliberately a plain anchor rather than next/link. A retry has to
          re-run the failed request, and client-side navigation to the route we
          are already on can be served from the router cache without ever
          hitting the server. A full document load is the behaviour we want. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="mt-6 inline-block rounded-sm border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-raised"
      >
        Try again
      </a>
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="rounded-sm border border-hairline bg-surface px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">
        {search ? "No markets match that search" : "No markets found"}
      </p>
      <p className="mx-auto mt-2 max-w-md text-xs text-muted">
        {search
          ? "Try a shorter phrase, or clear the category and liquidity filters."
          : "Try clearing the filters."}
      </p>
    </div>
  );
}
