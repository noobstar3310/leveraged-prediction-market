import type { Metadata } from "next";

import { mockMarketsClient } from "@/lib/data/mock";
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
  const { markets } = await mockMarketsClient.listMarkets({ limit: 500 });

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6">
      <header className="mb-4">
        <h1 className="text-lg font-medium text-foreground">Portfolio</h1>
      </header>

      <p className="mb-6 rounded-md border border-warn/50 bg-well px-4 py-2.5 text-xs text-warn">
        Demo data — positions are simulated and stored in this browser only.
        Nothing is on-chain and no money moves.
      </p>

      <PositionsList markets={markets} />
    </main>
  );
}
