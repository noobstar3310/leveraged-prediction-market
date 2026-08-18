"use client";

import { useSyncExternalStore } from "react";

import type { Side } from "@/lib/leverage";

/**
 * Client-side position store — FABRICATED, and not a substitute for a backend.
 *
 * Positions live in localStorage so they survive a reload. Nothing is settled,
 * nothing is on-chain, and no money moves. When a real adapter exists this whole
 * module is replaced; the trade panel and portfolio only touch the exported
 * functions, never the storage.
 */

const STORAGE_KEY = "lpm.positions.v1";

export type StoredPosition = {
  id: string;
  marketId: string;
  marketSlug: string;
  marketQuestion: string;
  side: Side;
  /** Collateral posted, in USDC. */
  margin: number;
  /**
   * EFFECTIVE leverage — notional ÷ margin after tiered margin is applied. This
   * is what all downstream maths uses, because it is what actually backs the
   * position.
   */
  leverage: number;
  /**
   * What the trader picked on the slider. Optional: positions stored before
   * tiered margin existed don't have it, and the UI falls back to `leverage`.
   */
  selectedLeverage?: number;
  /** Market YES probability when the position was opened. */
  entryPrice: number;
  /** ISO 8601. Runtime clock is fine here — this is a user action, not a fixture. */
  openedAt: string;
};

const EMPTY: StoredPosition[] = [];

/**
 * useSyncExternalStore compares snapshots by reference, so a fresh array on
 * every read would loop forever. The parsed value is cached and only replaced
 * when the underlying string actually changes.
 */
let cachedRaw: string | null = null;
let cachedValue: StoredPosition[] = EMPTY;

const listeners = new Set<() => void>();

function read(): StoredPosition[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can throw in private mode or when blocked by policy.
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedValue;

  cachedRaw = raw;
  if (!raw) {
    cachedValue = EMPTY;
    return cachedValue;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    cachedValue = Array.isArray(parsed) ? (parsed as StoredPosition[]) : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }
  return cachedValue;
}

function write(positions: StoredPosition[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Best effort: an unwritable store shouldn't break the trade flow.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Keep tabs in sync — localStorage fires `storage` in *other* documents.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Reactive list of open positions. Empty during SSR. */
export function usePositions(): StoredPosition[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function openPosition(
  position: Omit<StoredPosition, "id" | "openedAt">,
): StoredPosition {
  const created: StoredPosition = {
    ...position,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `pos-${Date.now()}-${listeners.size}`,
    openedAt: new Date().toISOString(),
  };
  write([created, ...read()]);
  return created;
}

export function closePosition(id: string): void {
  write(read().filter((p) => p.id !== id));
}
