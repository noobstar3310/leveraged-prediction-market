import type { Metadata } from "next";
// Sourced from the `geist` package, NOT next/font/google — the Google Fonts
// build of Geist omits the `tnum` and `zero` OpenType features this app relies
// on for tabular figures and a slashed zero.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { SiteNav } from "@/components/nav/site-nav";
import { SolanaProvider } from "@/components/wallet/wallet-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leveraged Prediction Market",
  description: "Bet on outcomes with up to 20x leverage.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SolanaProvider>
          <SiteNav />
          {children}
        </SolanaProvider>
      </body>
    </html>
  );
}
