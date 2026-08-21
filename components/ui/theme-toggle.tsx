"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/ui/theme";

/**
 * Light/dark switch.
 *
 * No animation: this is chrome the user touches repeatedly, which the frequency
 * gate disqualifies. The icon swaps instantly.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="control flex size-9 items-center justify-center"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {isDark ? (
        <Sun aria-hidden size={15} />
      ) : (
        <Moon aria-hidden size={15} />
      )}
    </button>
  );
}
