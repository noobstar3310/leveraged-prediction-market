import { MarketGridSkeleton } from "@/components/market/market-grid";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-baseline justify-between border-b border-hairline pb-4">
        <h1 className="text-lg font-medium text-foreground">Markets</h1>
      </div>
      <MarketGridSkeleton />
    </main>
  );
}
