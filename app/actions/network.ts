"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { NETWORK_COOKIE } from "@/lib/data/network";
import { parseNetwork } from "@/lib/predict/config";

/**
 * Switch the data source between testnet and mainnet.
 *
 * A Server Action, so the cookie is set on the server and every subsequent
 * render reads the new network. `revalidatePath("/", "layout")` clears the
 * router cache for the whole tree — without it, an already-visited market page
 * would be served from cache and keep showing the previous network's prices.
 */
export async function setNetwork(formData: FormData) {
  const next = parseNetwork(String(formData.get("network") ?? ""));
  const store = await cookies();
  store.set(NETWORK_COOKIE, next, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
