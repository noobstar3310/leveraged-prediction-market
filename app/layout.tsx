import type { Metadata } from "next";
// Geist comes from the `geist` npm package, NOT next/font/google — the Google
// Fonts build omits the `tnum` and `zero` OpenType features this app relies on.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TikTok_Sans } from "next/font/google";
import { Toaster } from "sonner";

import { SiteNav } from "@/components/nav/site-nav";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/ui/theme";
import { ChainProvider } from "@/components/wallet/wallet-provider";
import { getNetwork } from "@/lib/data/network";
import { isNetworkConfigured } from "@/lib/predict/config";
import "./globals.css";

/**
 * Headlines only. Variable, so one load covers every weight we use.
 *
 * `adjustFontFallback: false` is deliberate. Next normally synthesises a
 * metrically-matched local fallback (size-adjust, ascent-override) so headings
 * don't reflow when the web font swaps in — but TikTok Sans is too new to be in
 * Next's capsize metrics table, so it can't, and warns on every compile.
 *
 * Turning it off and naming the fallback stack ourselves silences a warning we
 * cannot otherwise fix. The trade-off is a small heading reflow on first paint;
 * acceptable because this face is used only for headings, never body copy.
 */
const tiktokSans = TikTok_Sans({
  subsets: ["latin"],
  variable: "--font-tiktok-sans",
  display: "swap",
  adjustFontFallback: false,
  fallback: [
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  title: "Leveraged Prediction Market",
  description: "Bet on outcomes with up to 20x leverage.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read here rather than in the nav: the nav is a Client Component and the
  // cookie (and the API-key check) must be resolved on the server.
  const network = await getNetwork();

  return (
    <html
      lang="en"
      // The init script sets data-theme before hydration, so the server and
      // client markup differ by design on this element.
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${tiktokSans.variable} h-full antialiased`}
    >
      <head>
        {/* Before first paint — otherwise dark-mode users get a white flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <ChainProvider>
            <SiteNav
              network={network}
              mainnetConfigured={isNetworkConfigured("mainnet")}
            />
            {children}
          </ChainProvider>
          {/* Mounted once, at the root, and outside the providers: an ancestor
              with transform/filter/overflow creates a stacking context that can
              clip or bury toasts. */}
          <Toaster position="bottom-right" offset={24} mobileOffset={16} />
        </ThemeProvider>
      </body>
    </html>
  );
}
