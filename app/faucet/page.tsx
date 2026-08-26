import type { Metadata } from "next";

import { FaucetPanel } from "@/components/wallet/faucet-panel";
import { WalletDiagnostics } from "@/components/wallet/wallet-diagnostics";
import { GAS_SYMBOL } from "@/lib/chain/config";
import { IS_GAS_FAUCET_CONFIGURED } from "@/lib/wallet/gas-faucet";

export const metadata: Metadata = {
  title: "Fund wallet · Leveraged",
  description: "Get testnet gas and collateral to trade with.",
};

/**
 * Testnet funding.
 *
 * A page rather than a modal: it is a two-step errand that ends in another tab
 * (the gas faucet) and a wallet confirmation, and a dialog that has to survive
 * both is worse than a page you can come back to.
 */
export default function FaucetPage() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-[11px] tracking-[0.14em] text-faint uppercase">
          Testnet
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Fund wallet
        </h1>
        <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-muted">
          Two things are needed to trade on testnet: {GAS_SYMBOL} to pay for
          transactions, and the collateral token positions are denominated in.
          Neither is worth anything — this is a test network.
        </p>
      </header>

      {/* Resolved on the server: whether the drip key exists must never be
          inferred client-side, and the key itself never leaves this process. */}
      <FaucetPanel gasFaucetConfigured={IS_GAS_FAUCET_CONFIGURED} />

      <WalletDiagnostics />

      <p className="mt-8 text-[11px] leading-relaxed text-faint">
        Nothing here exists on mainnet. Real USDT cannot be minted, so this page
        only does anything while your wallet is on BNB Smart Chain Testnet.
      </p>
    </main>
  );
}
