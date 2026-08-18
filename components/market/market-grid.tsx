import type { Market } from "@/lib/data/clients";
import { MarketCard } from "@/components/market/market-card";

/**
 * Uniform grid of market tiles — three across on wide screens, like the
 * reference. Not a bento: every tile is the same size.
 */
export function MarketGrid({ markets }: { markets: Market[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {markets.map((market) => (
        <li key={market.id}>
          <MarketCard market={market} />
        </li>
      ))}
    </ul>
  );
}
