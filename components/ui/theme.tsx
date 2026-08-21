"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "lpm.theme";

/**
 * Runs before first paint, inlined in <head>.
 *
 * Without it the page renders in the default theme and then snaps to the chosen
 * one — a white flash for every dark-mode user on every navigation. It sets the
 * attribute the CSS keys off, so there is nothing left to correct.
 */
export const THEME_INIT_SCRIPT = `
try {
  var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  var theme = stored === "light" || stored === "dark"
    ? stored
    : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
} catch (e) {}
`.trim();

/**
 * The theme lives on the <html> element, not in React state — the inline script
 * sets it before React exists. useSyncExternalStore is the correct primitive for
 * that: it reads the DOM as the source of truth and subscribes to changes,
 * rather than copying the value into state inside an effect.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** SSR has no DOM; the inline script corrects this before the user sees it. */
function getServerSnapshot(): Theme {
  return "light";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the theme still applies for this session.
    }
    // No setState — the MutationObserver above picks the change up.
  }, []);

  return { theme, toggle };
}

/** Kept so the layout has a single place to wrap, if this ever needs context. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
