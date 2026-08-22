"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { encodeFunctionData, parseUnits } from "viem";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { bscTestnet } from "wagmi/chains";

import { useBalances } from "@/components/wallet/balances-provider";
import { useSmartWallet } from "@/components/wallet/smart-wallet";
import { useWalletAvailability } from "@/components/wallet/availability";
import {
  FAUCET_ABI,
  FAUCET_AMOUNT,
  GAS_FAUCET_URL,
  faucetFor,
} from "@/lib/wallet/collateral";
import { GAS_SYMBOL } from "@/lib/chain/config";

const BTN = "control h-9 px-4 text-xs";

/**
 * Testnet funding.
 *
 * Two different problems, deliberately shown as two steps: gas cannot be minted
 * and has to come from the official faucet, while the collateral token exposes
 * a permissionless `allocateTo` we can call directly with the user's wallet.
 * Collapsing them into one button would promise something the first half
 * cannot deliver.
 *
 * This is the only place in the app that sends a transaction. Everything else
 * is read-only, so the states below are spelled out rather than reduced to a
 * spinner: a user who has just been asked to sign needs to know whether the
 * wallet is waiting, the chain is waiting, or it failed.
 */
export function FaucetPanel() {
  const availability = useWalletAvailability();
  const { authenticated, login } = usePrivy();
  const { chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const {
    address,
    isSmartAccount,
    collateral,
    collateralSymbol,
    gas,
    refresh,
  } = useBalances();
  const { sendSponsored } = useSmartWallet();

  // Sponsored sends bypass wagmi entirely, so they need their own state.
  const [sponsoredHash, setSponsoredHash] = useState<`0x${string}`>();
  const [sponsoredError, setSponsoredError] = useState<Error>();
  const [sponsoring, setSponsoring] = useState(false);

  const token = faucetFor(chainId);

  const {
    writeContract,
    data: hash,
    isPending: signing,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: confirming,
    isSuccess: confirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: Boolean(hash),
      // Balances are stale the moment this lands, so pull them again.
      refetchOnWindowFocus: false,
    },
  });

  // Balances are stale the moment the mint lands. Refetching is a genuine
  // effect — a network read triggered by a state transition — so it belongs
  // here rather than in render. Keyed on the hash so it fires once per mint.
  useEffect(() => {
    if (confirmed && hash) refresh();
  }, [confirmed, hash, refresh]);

  // A sponsored send resolves only once the bundler has included it, so the
  // hash arriving is itself the confirmation.
  useEffect(() => {
    if (sponsoredHash) refresh();
  }, [sponsoredHash, refresh]);

  const mint = async () => {
    if (!token || !address) return;
    const args = [address, parseUnits(String(FAUCET_AMOUNT), token.decimals)] as const;

    // Sponsored path: the paymaster pays, so the user needs no gas at all. This
    // is the whole point of the smart account for a new user — they arrive with
    // an empty wallet and still get funded.
    if (sendSponsored) {
      setSponsoring(true);
      setSponsoredError(undefined);
      setSponsoredHash(undefined);
      try {
        const hash = await sendSponsored({
          to: token.address,
          data: encodeFunctionData({
            abi: FAUCET_ABI,
            functionName: "allocateTo",
            args: [args[0], args[1]],
          }),
        });
        setSponsoredHash(hash);
      } catch (e) {
        setSponsoredError(e as Error);
      } finally {
        setSponsoring(false);
      }
      return;
    }

    // Fallback: an external EOA pays its own gas.
    reset();
    writeContract({
      abi: FAUCET_ABI,
      address: token.address,
      functionName: "allocateTo",
      args: [args[0], args[1]],
    });
  };

  const error = writeError ?? receiptError ?? sponsoredError;

  return (
    <div className="flex flex-col gap-4">
      <Step
        n={1}
        title={
          isSmartAccount
            ? `${GAS_SYMBOL} for gas — not needed`
            : `Get ${GAS_SYMBOL} for gas`
        }
        done={isSmartAccount || (gas !== null && gas > 0)}
        body={
          <>
            <p className="text-xs leading-relaxed text-muted">
              {isSmartAccount
                ? `Your smart account's gas is sponsored, so you can skip this
                   entirely. The link is here only if you want to fund it
                   yourself.`
                : `Every transaction costs ${GAS_SYMBOL}, and it cannot be
                   minted — it comes from the official faucet. You need this
                   before step 2 will go through.`}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <a
                href={GAS_FAUCET_URL}
                target="_blank"
                rel="noreferrer"
                className={`${BTN} inline-block leading-9`}
              >
                Open {GAS_SYMBOL} faucet ↗
              </a>
              <span className="numeric text-xs text-faint">
                balance {gas === null ? "—" : `${gas.toFixed(4)} ${GAS_SYMBOL}`}
              </span>
            </div>
          </>
        }
      />

      <Step
        n={2}
        title={`Get ${collateralSymbol} to trade with`}
        done={collateral !== null && collateral > 0}
        body={
          <>
            <p className="text-xs leading-relaxed text-muted">
              The testnet collateral token lets anyone mint their own. This calls{" "}
              <code className="text-foreground">allocateTo</code> on it directly
              from your wallet — no faucet queue, no rate limit.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {availability !== "ready" ? (
                <span className="text-xs text-warn">
                  Wallet unavailable — check the Privy App ID.
                </span>
              ) : !authenticated || !isConnected ? (
                <button type="button" onClick={() => login()} className={BTN}>
                  Connect wallet
                </button>
              ) : !token ? (
                <button
                  type="button"
                  onClick={() => switchChain({ chainId: bscTestnet.id })}
                  className={`${BTN} border-warn/50 text-warn`}
                >
                  Switch to {bscTestnet.name}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void mint()}
                  disabled={signing || confirming || sponsoring}
                  className={BTN}
                >
                  {sponsoring
                    ? "Minting…"
                    : signing
                      ? "Confirm in wallet…"
                      : confirming
                        ? "Minting…"
                        : `Fund wallet — ${FAUCET_AMOUNT} ${collateralSymbol}`}
                </button>
              )}

              <span className="numeric text-xs text-faint">
                balance{" "}
                {collateral === null
                  ? "—"
                  : `${collateral.toFixed(2)} ${collateralSymbol}`}
              </span>
            </div>

            {(hash || sponsoredHash) && (
              <p className="numeric mt-3 text-[11px] break-all text-faint">
                {confirmed || sponsoredHash ? "Confirmed" : "Submitted"}:{" "}
                <a
                  href={`${bscTestnet.blockExplorers.default.url}/tx/${
                    sponsoredHash ?? hash
                  }`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {(sponsoredHash ?? hash)!.slice(0, 10)}…
                  {(sponsoredHash ?? hash)!.slice(-8)} ↗
                </a>
              </p>
            )}

            {error && (
              // Wallet errors are long and usually carry the useful sentence
              // first; the rest is a stack the user cannot act on.
              <p className="mt-3 text-[11px] leading-relaxed text-short">
                {(error as { shortMessage?: string }).shortMessage ??
                  error.message.split("\n")[0]}
              </p>
            )}
          </>
        }
      />
    </div>
  );
}

function Step({
  n,
  title,
  body,
  done,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
  done: boolean;
}) {
  return (
    <section className="panel p-5">
      <div className="flex items-baseline gap-3">
        <span
          className={`numeric flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
            done ? "border-long text-long" : "border-border text-faint"
          }`}
        >
          {done ? "✓" : n}
        </span>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
      </div>
      <div className="mt-2 pl-8">{body}</div>
    </section>
  );
}
