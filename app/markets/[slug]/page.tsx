import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getMarketsClient } from "@/lib/data";
import { MarketTerminal } from "@/components/trade/market-terminal";
import {
  formatCloseDate,
  formatPrice,
  formatProbability,
  formatUsdCompact,
} from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/markets/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const client = await getMarketsClient();
  const market = await client.getMarket(slug);
  return { title: market ? `${market.question} · Leveraged` : "Market not found" };
}

export default async function MarketDetailPage({
  params,
}: PageProps<"/markets/[slug]">) {
  const { slug } = await params;
  const client = await getMarketsClient();
  const market = await client.getMarket(slug);
  if (!market) notFound();

  const candles = await client.getCandles(market);
  const previous = candles[candles.length - 2]?.close ?? market.yesPrice;
  const change = market.yesPrice - previous;

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <Link
            href="/"
            className="text-[11px] text-faint transition-colors hover:text-foreground"
          >
            ← Markets
          </Link>
          <p className="mt-2 text-[10px] tracking-widest text-faint uppercase">
            {market.category}
          </p>
          <h1 className="mt-1 text-lg leading-snug font-medium text-foreground">
            {market.question}
          </h1>
        </div>

        {/* Flat stats, no depth — this is data, and data never competes with
            controls for attention. */}
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <Stat label="Chance of yes" value={formatProbability(market.yesPrice)} />
          <Stat
            label="24h change"
            value={`${change >= 0 ? "▲ +" : "▼ −"}${Math.abs(change * 100).toFixed(2)} pts`}
            tone={change >= 0 ? "long" : "short"}
          />
          <Stat
            label="Yes / No"
            value={`${formatPrice(market.yesPrice)} / ${formatPrice(market.noPrice)}`}
          />
          <Stat label="24h volume" value={formatUsdCompact(market.volume24h)} />
          <Stat label="Closes" value={formatCloseDate(market.closesAt)} />
        </dl>
      </header>

      <MarketTerminal market={market} candles={candles} />
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "long" | "short";
}) {
  const toneClass =
    tone === "long" ? "text-long" : tone === "short" ? "text-short" : "text-foreground";
  return (
    <div>
      <dt className="text-[10px] tracking-wide text-faint uppercase">{label}</dt>
      <dd className={`numeric mt-1 text-sm ${toneClass}`}>{value}</dd>
    </div>
  );
}
