import type { Metadata } from "next";

import { getMarketsClient } from "@/lib/data";
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";
import { PositionsList } from "@/components/portfolio/positions-list";

export const metadata: Metadata = {
  title: "Portfolio · Leveraged",
};

/**
 * Open positions.
 *
 * Positions are stored client-side, but the mark prices they're valued against
 * come from the server — so this page fetches the whole market set and hands it
 * down. Passing 76 lightweight rows is cheaper than a round trip per position.
 */
export default async function PortfolioPage() {
  const { markets } = await (await getMarketsClient()).listMarkets({ limit: 500 });

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6">
      <header className="mb-4">
        <h1 className="text-lg font-medium text-foreground">Portfolio</h1>
      </header>

      <div className="mb-6">
        <PortfolioSummary markets={markets} />
      </div>

      <h2 className="mb-3 text-[10px] tracking-wide text-faint uppercase">
        Open positions
      </h2>
      <PositionsList markets={markets} />
    </main>
  );
}
