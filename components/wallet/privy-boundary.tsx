"use client";

import { Component, type ReactNode } from "react";

/**
 * Contains Privy initialisation failures.
 *
 * PrivyProvider throws outright on a malformed, revoked or mistyped App ID —
 * verified: a bad id turns every route into a 500, including the markets grid
 * and the docs page, which need no wallet at all.
 *
 * The wallet is not allowed to take down read-only surfaces. On failure this
 * renders `fallback`, which is the same signed-out tree used when no App ID is
 * configured. A class component because error boundaries have no hook form.
 */
export class PrivyBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Loud in the console, silent on the page: the wallet button already
    // explains that connecting is unavailable, and a user can do nothing about
    // a bad App ID.
    console.error(
      "[privy] provider failed to initialise — wallet features disabled. " +
        "Check NEXT_PUBLIC_PRIVY_APP_ID against dashboard.privy.io.",
      error,
    );
    // Let the provider record it, so the wallet button can say "unavailable"
    // rather than sitting on a spinner that will never resolve.
    this.props.onFail();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
