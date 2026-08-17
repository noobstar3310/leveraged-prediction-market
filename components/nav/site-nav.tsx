"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { WalletButton } from "@/components/wallet/wallet-button";

const LINKS = [
  { href: "/", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Site chrome. Client-side only because it reads the active route.
 *
 * No animation anywhere here — switching tabs is a 100+/day action, which the
 * frequency gate disqualifies outright. The active route is a colour and border
 * change, applied instantly.
 */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Leveraged
          </span>
          {/* Says plainly which chain this is pointed at. A user should never
              have to guess whether the balance on screen is real money. */}
          <span className="rounded-sm border border-warn/40 px-1 text-[10px] tracking-wider text-warn uppercase">
            Devnet
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

        <div className="ml-auto flex items-center">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
