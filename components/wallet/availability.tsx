"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Why the wallet may be unusable, so the UI can say so precisely.
 *
 * - `ready`        — Privy is configured and mounting normally.
 * - `unconfigured` — no NEXT_PUBLIC_PRIVY_APP_ID.
 * - `failed`       — Privy threw on init (bad, revoked or mistyped App ID).
 *
 * The distinction matters: "not configured" is a setup step, "failed" means the
 * value present is wrong. Both are far more useful than a spinner that never
 * resolves, which is what a signed-out tree would otherwise show forever.
 */
export type WalletAvailability = "ready" | "unconfigured" | "failed";

const Ctx = createContext<WalletAvailability>("ready");

export const useWalletAvailability = () => useContext(Ctx);

export function WalletAvailabilityProvider({
  value,
  children,
}: {
  value: WalletAvailability;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
