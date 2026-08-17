/**
 * Placeholder shaped like MarketCard.
 *
 * Deliberately static — no pulse, no shimmer. The design system treats perpetual
 * background animation as noise, and a grid of pulsing cards is a lot of motion
 * to show someone before they have read anything.
 */
export function MarketCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-full flex-col gap-3 rounded-sm border border-hairline bg-surface p-4"
    >
      <div className="h-2 w-16 rounded-sm bg-raised" />

      <div className="flex flex-col gap-2">
        <div className="h-3 w-full rounded-sm bg-raised" />
        <div className="h-3 w-4/5 rounded-sm bg-raised" />
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <div className="h-6 w-16 rounded-sm bg-raised" />
        <div className="h-1 w-full bg-raised" />
      </div>

      <div className="flex items-center justify-between border-t border-hairline pt-3">
        <div className="h-3 w-24 rounded-sm bg-raised" />
        <div className="h-3 w-20 rounded-sm bg-raised" />
      </div>
    </div>
  );
}
