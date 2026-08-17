import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio · Leveraged",
};

/**
 * Placeholder. Real content — open positions with unrealized PnL, health and
 * liquidation proximity, plus settled history — is the next feature.
 *
 * It exists now so the navbar has somewhere to go. An empty state that says
 * what is coming beats a 404.
 */
export default function PortfolioPage() {
  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6">
      <header className="mb-6 border-b border-hairline pb-4">
        <h1 className="text-lg font-medium text-foreground">Portfolio</h1>
      </header>

      <div className="rounded-sm border border-hairline bg-surface px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No open positions</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted">
          Positions, unrealized PnL and liquidation health will appear here once
          trading is built. Nothing is tracked yet.
        </p>
      </div>
    </main>
  );
}
