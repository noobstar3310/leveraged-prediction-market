"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";

import {
  DEFAULT_COLLATERAL_SYMBOL,
  ERC20_ABI,
  collateralFor,
} from "@/lib/wallet/collateral";
import { GAS_SYMBOL } from "@/lib/chain/config";
import { useSmartWallet } from "@/components/wallet/smart-wallet";

type Balances = {
  /**
   * The address funds actually live at — the smart account when one exists,
   * otherwise the connected EOA. Everything that receives or spends tokens must
   * use this, not `useAccount().address`, which is only ever the signer.
   */
  address?: `0x${string}`;
  /** True when a smart account is active, so gas can be sponsored. */
  isSmartAccount: boolean;
  /** Settlement asset available to trade. Null while unknown. */
  collateral: number | null;
  /**
   * Ticker of the settlement asset on the connected chain — USDT on mainnet,
   * TUSD on testnet. Carried alongside the amount because no screen may
   * hardcode it; a number labelled with the wrong ticker is a lie about what a
   * trader is risking.
   */
  collateralSymbol: string;
  /** Native token, used only for transaction fees. */
  gas: number | null;
  gasSymbol: string;
  refresh: () => void;
};

const BalancesContext = createContext<Balances>({
  isSmartAccount: false,
  collateral: null,
  collateralSymbol: DEFAULT_COLLATERAL_SYMBOL,
  gas: null,
  gasSymbol: GAS_SYMBOL,
  refresh: () => {},
});

export const useBalances = () => useContext(BalancesContext);

/**
 * Fetches both balances once, for everyone.
 *
 * The wallet button and the trade panel both need them, and the panel gates
 * opening a position on having enough collateral. Fetching in one place avoids
 * two components issuing the same RPC call.
 *
 * wagmi keys its queries by address AND chain, so a stale response for a
 * previous wallet can never be rendered against a new one.
 */
export function BalancesProvider({ children }: { children: ReactNode }) {
  const { address: eoaAddress, chainId, isConnected } = useAccount();
  const { address: smartAddress } = useSmartWallet();

  // The smart account wins when present. Reading the EOA instead would show a
  // balance the user cannot trade with.
  const address = smartAddress ?? eoaAddress;
  const isSmartAccount = Boolean(smartAddress);
  const token = collateralFor(chainId);

  const gas = useBalance({
    address,
    query: { enabled: Boolean(address) && (isConnected || isSmartAccount) },
  });

  const collateral = useReadContract({
    abi: ERC20_ABI,
    address: token?.address,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        Boolean(address) && Boolean(token) && (isConnected || isSmartAccount),
    },
  });

  // Stable identity: consumers put this in effect dependency arrays, and a new
  // function every render would re-run those effects forever.
  const gasRefetch = gas.refetch;
  const collateralRefetch = collateral.refetch;
  const refresh = useCallback(() => {
    void gasRefetch();
    void collateralRefetch();
  }, [gasRefetch, collateralRefetch]);

  return (
    <BalancesContext.Provider
      value={{
        address,
        isSmartAccount,
        collateral:
          collateral.data !== undefined && token
            ? Number(formatUnits(collateral.data as bigint, token.decimals))
            : null,
        // Before a wallet reports a chain there is no token to name, so fall
        // back to the default chain's ticker rather than showing a blank.
        collateralSymbol: token?.symbol ?? DEFAULT_COLLATERAL_SYMBOL,
        gas: gas.data ? Number(formatUnits(gas.data.value, gas.data.decimals)) : null,
        gasSymbol: gas.data?.symbol ?? GAS_SYMBOL,
        refresh,
      }}
    >
      {children}
    </BalancesContext.Provider>
  );
}
