/**
 * USDC on BNB Chain — the settlement asset.
 *
 * Collateral, position size, PnL and payouts are all denominated in USDC. BNB
 * is only ever used for gas.
 *
 * Both addresses below were verified on-chain (symbol + decimals read via
 * eth_call) rather than copied from memory. Note the decimals: USDC is 18 on
 * BNB Chain, NOT the 6 it uses on Ethereum and Solana. Getting this wrong
 * misreports a balance by a factor of a trillion.
 */
import { bsc, bscTestnet } from "wagmi/chains";

export const USDC_SYMBOL = "USDC";

export const USDC_BY_CHAIN: Record<number, { address: `0x${string}`; decimals: number }> =
  {
    [bsc.id]: {
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      decimals: 18,
    },
    [bscTestnet.id]: {
      address: "0x64544969ed7EBf5f083679233325356EbE738930",
      decimals: 18,
    },
  };

/** Minimal BEP-20 surface — balanceOf is all we read. */
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const usdcFor = (chainId: number | undefined) =>
  chainId === undefined ? undefined : USDC_BY_CHAIN[chainId];

/**
 * Where a user obtains USDC.
 *
 * On testnet the BNB Chain faucet is the only sanctioned source, and it issues
 * gas plus a small set of test tokens — it is not a dedicated USDC tap, which
 * the link text must not imply. On mainnet, USDC is bridged or bought.
 */
export const USDC_FAUCET_URL = "https://www.bnbchain.org/en/testnet-faucet";
