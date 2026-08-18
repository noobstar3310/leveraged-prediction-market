import {
  MARKET_CATEGORIES,
  MARKET_SORTS,
  MarketDataError,
  type MarketCategory,
  type MarketPage,
  type MarketSort,
} from "@/lib/data/clients";
import { mockMarketsClient } from "@/lib/data/mock";
import {
  MarketSearch,
  MarketToolbar,
} from "@/components/market/market-toolbar";
import { MarketGrid } from "@/components/market/market-grid";

/** Deliberately short. A browse screen is a shortlist, not a catalogue. */
const PAGE_SIZE = 6;

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

export default async function MarketsPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const search = first(params.q).slice(0, 100);
  const category = parseCategory(first(params.category));
  const sort = parseSort(first(params.sort));

  let page: MarketPage | null = null;
  let errorMessage: string | null = null;

  try {
    page = await mockMarketsClient.listMarkets({
      search,
      category: category || undefined,
      sort,
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
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Markets
        </h1>
        <MarketSearch search={search} category={category} sort={sort} />
      </header>

      <div className="mb-6">
        <MarketToolbar search={search} category={category} sort={sort} />
      </div>

      {page && page.markets.length > 0 && (
        <p className="mb-4 text-xs text-faint">
          <span className="numeric">{page.markets.length}</span> of{" "}
          <span className="numeric">{page.totalMatching}</span>{" "}
          {search || category ? "matching markets" : "markets"}
        </p>
      )}

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
