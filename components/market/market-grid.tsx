import type { Market } from "@/lib/data/clients";
import { MarketCard } from "@/components/market/market-card";

/**
 * Uniform grid of market tiles.
 *
 * Not a bento — that name means varied tile sizes, and every tile here is the
 * same. The hero/unit split was removed deliberately: with a short list, size
 * variation bought emphasis nobody asked for and cost a consistent scan column.
 */
export function MarketGrid({ markets }: { markets: Market[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {markets.map((market) => (
        <li key={market.id}>
          <MarketCard market={market} />
        </li>
      ))}
    </ul>
  );
}
