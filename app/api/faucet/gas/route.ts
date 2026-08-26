import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  isAddress,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  GAS_DRIP_BNB,
  GAS_DRIP_COOLDOWN_MS,
  GAS_FAUCET_CHAIN,
  dripLog,
  faucetPrivateKey,
} from "@/lib/wallet/gas-faucet";

/**
 * Human wait time.
 *
 * "about 47h" is technically correct and useless — at a 48-hour cooldown a
 * reader wants days. Rounds up so the message never tells someone to come back
 * before the window has actually elapsed.
 */
function formatWait(ms: number): string {
  const hours = Math.ceil(ms / 3_600_000);
  if (hours < 1) return "under an hour";
  if (hours < 24) return `about ${hours}h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  const dayPart = `${days} day${days === 1 ? "" : "s"}`;
  return rest === 0 ? `about ${dayPart}` : `about ${dayPart} ${rest}h`;
}

/**
 * Sends a fixed amount of testnet BNB to a requested address.
 *
 * Deliberately narrow: the caller supplies only a destination. Amount, chain
 * and sender are all fixed server-side, so the worst a hostile caller can do is
 * request a drip to an address they control — which is the feature.
 */
export async function POST(request: Request) {
  const key = faucetPrivateKey();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Gas faucet is not configured. Set FAUCET_PRIVATE_KEY in .env.local to a funded BNB testnet key.",
      },
      { status: 503 },
    );
  }

  let to: unknown;
  try {
    ({ to } = (await request.json()) as { to?: unknown });
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  // `strict: false` validates the hex shape without demanding EIP-55 casing.
  // The default rejects a correctly-formed lowercase address, which is a common
  // way to pass one and has nothing to do with whether it is valid.
  if (typeof to !== "string" || !isAddress(to, { strict: false })) {
    return NextResponse.json({ error: "A valid address is required." }, { status: 400 });
  }

  const recipient = to.toLowerCase();
  const last = dripLog.get(recipient);
  if (last && Date.now() - last < GAS_DRIP_COOLDOWN_MS) {
    const remainingMs = GAS_DRIP_COOLDOWN_MS - (Date.now() - last);
    return NextResponse.json(
      {
        error: `Already funded. Try again in ${formatWait(remainingMs)}.`,
        retryAfterMs: remainingMs,
      },
      { status: 429 },
    );
  }

  const account = privateKeyToAccount(key);
  const transport = http(GAS_FAUCET_CHAIN.rpcUrls.default.http[0]);
  const publicClient = createPublicClient({ chain: GAS_FAUCET_CHAIN, transport });
  const wallet = createWalletClient({ account, chain: GAS_FAUCET_CHAIN, transport });

  const value = parseEther(GAS_DRIP_BNB);

  try {
    // Check before sending so an empty faucet reports itself clearly instead of
    // failing deep inside viem with an opaque revert.
    const balance = await publicClient.getBalance({ address: account.address });
    if (balance < value) {
      return NextResponse.json(
        {
          error: `Faucet wallet is empty. Top up ${account.address} with testnet BNB.`,
          faucetAddress: account.address,
        },
        { status: 503 },
      );
    }

    const hash = await wallet.sendTransaction({
      // Normalised to checksum form for the send itself.
      to: getAddress(to),
      value,
    });

    // Recorded only after the send succeeds — a failed attempt must not burn
    // the caller's cooldown.
    dripLog.set(recipient, Date.now());

    return NextResponse.json({ hash, amount: GAS_DRIP_BNB, from: account.address });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.split("\n")[0] : "Failed to send BNB.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
