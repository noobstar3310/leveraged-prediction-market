import type { Market } from "@/lib/data/clients";
import { MarketCard } from "@/components/market/market-card";
import { MarketCardSkeleton } from "@/components/market/market-card-skeleton";

const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function MarketGrid({ markets }: { markets: Market[] }) {
  return (
    <ul className={GRID}>
      {markets.map((market) => (
        <li key={market.id}>
          <MarketCard market={market} />
        </li>
      ))}
    </ul>
  );
}

export function MarketGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }, (_, i) => (
        <MarketCardSkeleton key={i} />
      ))}
    </div>
  );
}
