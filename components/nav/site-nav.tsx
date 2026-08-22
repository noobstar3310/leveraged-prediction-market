"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useAccount } from "wagmi";
import { bsc } from "wagmi/chains";

import { DEFAULT_CHAIN, chainLabel } from "@/lib/chain/config";
import { NetworkSwitch } from "@/components/nav/network-switch";
import type { PredictNetwork } from "@/lib/predict/config";

const LINKS = [
  { href: "/", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/docs", label: "Docs" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Site chrome. Client-side only because it reads the active route.
 *
 * DELIBERATELY FLAT — no elevation, despite the rest of the system being
 * neumorphic. A sticky extruded bar casts a shadow lobe onto whatever scrolls
 * under it, producing a moving contrast gradient across live numbers. Same rule
 * applies to any future sticky toolbar or table header.
 *
 * No animation anywhere here either — switching tabs is a 100+/day action, which
 * the frequency gate disqualifies outright. The active route is a colour and
 * border change, applied instantly.
 */
export function SiteNav({
  network,
  mainnetConfigured,
}: {
  /** predict.fun data source — NOT the wallet's chain. They can differ. */
  network: PredictNetwork;
  mainnetConfigured: boolean;
}) {
  const pathname = usePathname();
  // The badge reports the chain the WALLET is on, falling back to the one we
  // would connect to. Deriving it beats hardcoding: a badge reading "Testnet"
  // while the wallet sits on mainnet is how someone loses real money.
  const { chainId } = useAccount();
  const shownChainId = chainId ?? DEFAULT_CHAIN.id;
  const isMainnet = shownChainId === bsc.id;

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-ground">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Leveraged
          </span>
          {/* Derived from the configured RPC endpoint, never hardcoded — a badge
              that says "Devnet" while pointed at mainnet is how someone loses
              real money. Mainnet is styled as a warning, not a label. */}
          <span
            className={`rounded-sm border px-1 text-[10px] tracking-wider uppercase ${
              isMainnet
                ? "border-short bg-short/15 text-short"
                : "border-warn/40 text-warn"
            }`}
          >
            {chainLabel(shownChainId)}
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px border-b-2 px-3 py-2 text-xs transition-colors ${
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NetworkSwitch
            current={network}
            mainnetConfigured={mainnetConfigured}
          />
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
