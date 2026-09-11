# Hyperliquid Leveraged Trading: How It Works

## Overview

Hyperliquid is an order-book based perpetual futures exchange running on its own L1 blockchain. Unlike pool-based leverage protocols (e.g. Jupiter Perps, GMX), Hyperliquid does not lend traders actual tokens. Leverage here is purely a margin requirement enforced by a central accounting engine called the **clearinghouse**. Positions are matched trader-to-trader (or trader-to-market-maker-vault), not trader-to-pool.

---

## 1. Core Structure

- **Order book model**: longs are matched against shorts, either from another real trader or from Hyperliquid's own market-making vault, **HLP** (Hyperliquid Provider vault), when no direct counterparty is available.
- **No token lending**: opening a $2,000 notional position does not mean $1,900 of any asset is borrowed and moved. The "extra" exposure is a ledger entry tracked by the clearinghouse — a synthetic/derivative position, not a real holding.
- **Settlement asset**: all margin, PnL, and fees are denominated in USDC.

---

## 2. Leverage Mechanics

### Margin requirement formula

```
Required margin = (Position size × Price) / Leverage
```

Example: opening a $2,000 BTC position at 20x leverage requires:
```
$2,000 / 20 = $100 margin
```

Only that $100 is real capital that moves. The rest of the "size" is accounting, not borrowed tokens.

### Leverage check timing

Leverage/margin sufficiency is checked **at the moment of opening** a position. After that, it is the trader's responsibility to monitor the position — funding payments and price movement can erode the effective margin ratio silently over time even though the originally selected leverage number doesn't change.

---

## 3. Margin Modes

| Mode | Description |
|---|---|
| **Isolated margin** | Only the capital explicitly allocated to that specific position is at risk. If it's liquidated, other funds in the account are untouched. |
| **Cross margin** (default) | The entire account balance (including unrealized PnL on other open positions) backs every open position simultaneously. Losses on one position can draw down funds allocated to others before liquidation occurs. |

---

## 4. Funding Rate

Rather than an hourly "borrow fee" (as in pool-based models), Hyperliquid uses a **periodic funding rate** paid directly between longs and shorts to keep the perpetual contract price anchored to the underlying spot price. If longs dominate open interest, longs pay shorts, and vice versa.

---

## 5. Liquidation Mechanism

Liquidation triggers once account equity (margin + unrealized PnL) falls below the **maintenance margin** threshold, which is set at roughly half of the initial margin required at maximum leverage for that asset.

Liquidation proceeds through **three escalating layers**:

### Layer 1 — Order book close
The system attempts to close the losing position by selling it directly into the live order book, same as a manual close. If enough liquidity is present, this executes cleanly, and **any collateral remaining after the position is closed is returned to the trader** — liquidation does not automatically forfeit 100% of collateral.

### Layer 2 — HLP vault backstop
If the order book cannot absorb the position fast enough (e.g. a fast-moving/illiquid market), the position is handed to the **HLP vault**, Hyperliquid's own market-making fund. HLP takes over the position near the trader's bankruptcy price and then manages/unwinds it, absorbing further gains or losses itself.

### Layer 3 — Auto-Deleveraging (ADL)
As a last resort in extreme conditions where even HLP cannot safely absorb the exposure, the system force-closes the **most profitable opposite-side traders** to keep the exchange solvent. This means a trader who is heavily in profit can be force-closed early during a crisis, even without any fault of their own.

**Liquidation cascade summary:**
```
Losing trader → Order book absorption → HLP vault → ADL (profitable counter-traders)
```

---

## 6. How HLP (the "LP side") Earns

Users deposit USDC into HLP and earn from three sources:
1. A share of trading fees generated on the exchange
2. Market-making profit/loss from providing liquidity on the order book
3. Profit/loss from absorbing liquidated positions (Layer 2 above)

This is not risk-free yield — HLP takes on real directional exposure and can lose money, e.g. if it absorbs a large liquidated position right before the market continues moving against that position.

---

## 7. Why No Token Reserve Pool Is Needed

Every position is fully matched: your long's notional exposure is mirrored by a real short (another trader or HLP), and both sides post real USDC margin. Profit is never "created" — it is a direct transfer from the losing side's real deposited margin to the winning side. Liquidation exists specifically to guarantee the losing side is force-closed *before* their margin reaches zero, so there is always enough real money to pay the winner in full.

If a single counterparty's margin is exhausted mid-move (i.e., price continues moving after they're liquidated), the position is handed off to a new counterparty (order book taker or HLP), which absorbs the continuation of the move. The original winner's final settlement is based purely on their own entry/exit price — the identity and number of counterparties on the other side during the life of the trade is invisible to them.

---

## 8. Comparison Reference (Hyperliquid vs. Pool-Based Models e.g. Jupiter Perps)

| | Hyperliquid | Jupiter Perps (for reference) |
|---|---|---|
| Counterparty | Another trader, or HLP vault | Always the liquidity pool (JLP) |
| What leverage does | Sets required margin % (no real loan) | Pool lends the trader real tokens |
| Ongoing cost | Periodic funding rate | Hourly borrow fee |
| Liquidation outcome | Order book sells first; leftover margin returned to trader | Pool seizes 100% of remaining collateral |
| Backstop layers | Order book → HLP → ADL | None — pool absorbs directly |
| Margin asset | USDC only (cross or isolated) | Asset-specific (e.g. SOL for long, USDC for short) |
| Liquidity provider token | HLP | JLP |
