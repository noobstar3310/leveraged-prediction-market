# How Leverage Works Here

Every number in this document was generated from `lib/leverage/` itself, not
transcribed. If the code changes and this file disagrees, the code is right —
regenerate the tables.

- **Implementation:** [`lib/leverage/index.ts`](lib/leverage/index.ts) (core maths),
  [`lib/leverage/tiers.ts`](lib/leverage/tiers.ts) (tiered margin)
- **Tests:** 43, run with `npm test`. This module is the one place in the repo
  where TDD is mandatory — it is the only thing that can be wrong without
  *looking* wrong on screen.

---

## 1. The thing you're actually buying

A market asks a yes/no question. Each side is a **share that pays exactly $1 if
its side is true, and $0 if it isn't.**

If the market prices YES at 64%:

- a YES share costs **$0.64**
- a NO share costs **$0.36**

The two prices always sum to $1, because exactly one side will be true.

Buying $100 of YES at 0.64 gets you 156 shares. If YES resolves true they pay
$156. If not, they pay nothing.

That's the whole product. Leverage just changes how many shares your money buys.

---

## 2. Leverage

You post **collateral** and choose a multiplier. The result is your **notional**
— the size of the position:

```
notional = collateral × leverage
shares   = notional ÷ price of your side
```

$100 at 5× controls $500, which at 0.64 buys 781 shares instead of 156. The
other $400 is effectively borrowed against your collateral.

### The vocabulary

| Term used in the UI | What it means |
|---|---|
| **Collateral** / margin | The money you put up. Your maximum loss. |
| **Position size** / notional | What you control: `collateral × leverage` |
| **Shares** | `notional ÷ entry price` |
| **Mark price** | The market's current YES probability |
| **Liquidation price** | Where your collateral is exhausted |
| **Health** | Fraction of collateral remaining, 100% → 0% |
| **Unrealized PnL** | Profit or loss if you closed right now |

---

## 3. Liquidation

Your position loses value as the price moves against you. When those losses
equal your collateral, there is nothing left backing the position and it is
force-closed.

Setting PnL equal to −collateral and solving for the price gives:

```
YES:  liquidation = entry × (1 − 1/L)
NO:   liquidation = entry + (1 − entry)/L
```

At **1× neither side can be liquidated** before resolution — the YES formula
bottoms out at 0 and the NO formula tops out at 1. That's why a 1× position is
simply held to the end.

### A. YES at 0.64, $100 collateral

| Leverage | Notional | Shares | Liquidation | Room | Payout if YES |
|---|---|---|---|---|---|
| 1× | $100.00 | 156 | 0.000 | never | $156.25 |
| 2× | $200.00 | 313 | 0.320 | 32.0 pts | $212.50 |
| 5× | $500.00 | 781 | 0.512 | 12.8 pts | $381.25 |
| 10× | $1000.00 | 1563 | 0.576 | 6.4 pts | $662.50 |
| 20× | $2000.00 | 3125 | 0.608 | 3.2 pts | $1225.00 |

**Every doubling of leverage halves your room to be wrong.** At 20× the market
only has to drift from 64% to 60.8% — three points, with the question still
undecided — and the position is gone.

### B. The NO side is tighter, which surprises people

Same market, same collateral, NO instead. Liquidation sits *above* entry.

| Leverage | Shares | Liquidation | Room |
|---|---|---|---|
| 1× | 278 | 1.000 | never |
| 5× | 1389 | 0.712 | 7.2 pts |
| 20× | 5556 | 0.658 | **1.8 pts** |

At 20× the NO side has **1.8 points** of room against YES's 3.2. Because NO
shares cost only $0.36, the same $2,000 buys 5,556 of them instead of 3,125 —
more shares, so each point of adverse move costs more. **Betting against a
likely outcome is the more fragile trade**, and the panel shows it directly.

### C. Watching a position die

10× YES at 0.64 with $100:

| Mark | PnL | Equity | Health |
|---|---|---|---|
| 0.700 | +$93.75 | $193.75 | 100% |
| 0.670 | +$46.88 | $146.88 | 100% |
| 0.640 | +$0.00 | $100.00 | 100% |
| 0.610 | −$46.88 | $53.12 | 53% |
| 0.580 | −$93.75 | $6.25 | 6% |
| 0.576 | −$100.00 | $0.00 | **0% — liquidated** |

Health is just `equity ÷ collateral`. A three-point move burns half of it.

---

## 4. Tiered margin

Leverage is **not** available at every size. Larger positions sit in tiers that
permit less of it, and a position spanning tiers is charged **each tier's rate
on its own slice** — exactly like income tax brackets.

| Position up to | Max leverage |
|---|---|
| $10,000 | 20× |
| $50,000 | 10× |
| $250,000 | 5× |
| $1,000,000 | 2× |
| above | 1× |

The rule, per slice:

```
rate = 1 ÷ min(selectedLeverage, tierMaxLeverage)
```

Selecting 20× buys 20× treatment only in tiers that allow it. In a 5×-capped
tier the slice is charged at 1/5 regardless of what you picked.

### Why it exists

A large position cannot be unwound at the price on the screen. Requiring more
collateral as size grows is how real venues price that risk. Without tiers, 20×
at any size quietly assumes infinite liquidity.

### What it does to your leverage

Selecting 20× on our table:

| Collateral | Max position | Effective leverage | Charged as |
|---|---|---|---|
| $500 | $10,000 | 20.00× | $10,000 @ 20× |
| $2,000 | $25,000 | 12.50× | $10,000 @ 20× + $15,000 @ 10× |
| $10,000 | $77,500 | 7.75× | $10,000 @ 20× + $40,000 @ 10× + $27,500 @ 5× |
| $50,000 | $261,000 | 5.22× | $10,000 @ 20× + $40,000 @ 10× + $200,000 @ 5× + $11,000 @ 2× |

### Selected vs effective leverage — this distinction matters

The slider shows what you **selected**. Tiered margin determines what you
**actually get**.

**Every downstream calculation uses the effective value.** A trader who selected
20× but is really at 7.75× must be shown the 7.75× liquidation price. Showing
the 20× one would place the line closer than reality — wrong in the dangerous
direction. The UI shows both: `20× → 7.75× effective`.

### Verified against a real venue

`marginRequirement()` takes a tier table as an argument, so the same code can be
run against Robinhood's published BTC tiers. The tests assert it reproduces
their documented worked examples:

| Position @ 10× | Robinhood publishes | This implementation |
|---|---|---|
| $1,000,000 | $100,000 | $100,000.00 |
| $1,100,000 | $114,290 | $114,285.71 |
| $1,300,000 | $142,870 | $142,857.14 |
| $1,400,000 | $157,160 | $157,142.86 |

The few dollars of difference is their published 14.29% versus the exact 1/7.
The tier-slicing itself is identical — a wrong algorithm would be out by
thousands.

---

## 5. Payout at resolution

A winning share pays $1. You keep the share value minus the borrowed portion:

```
payout = shares − (notional − collateral)
```

$100 at 10× on YES at 0.50 buys 2,000 shares for $1,000 notional, of which $900
is borrowed. If YES wins: `2000 − 900 = $1,100`. Profit is $1,000 on $100 — ten
times the 1× profit, as leverage implies.

If your side loses, the payout is **zero**. The collateral is gone.

---

## 6. What is deliberately NOT modelled

Read this before trusting a liquidation price.

**No maintenance margin.** This system liquidates at exactly zero equity — the
point real venues call the *bankruptcy price*. Robinhood, for example, closes
positions while roughly 5% of collateral remains, because selling takes time and
doesn't happen at the price on screen. **Our liquidation prices are therefore the
optimistic bound; a real venue would close you sooner.**

**No fees, funding or slippage.** Every figure is gross.

**No partial liquidation.** Positions are all-or-nothing.

**No gap protection — and this is the big one.** Perpetual futures on BTC trade
continuously, so a liquidation engine usually gets fills near the trigger. **A
prediction market resolves.** News lands and the price jumps from 0.64 to 0.99
with nothing traded in between. A 20× position isn't liquidated at 0.608; it is
skipped straight past, and somebody absorbs the difference.

That risk is worst exactly when volume is highest — the hours around resolution.
Any real deployment needs a maintenance buffer, partial liquidation and an
insurance fund before it handles money.

---

## 7. Using the module

```ts
import {
  liquidationPrice, unrealizedPnl, healthFactor,
  payoutAtResolution, sharesFor, notionalFor,
  MAX_LEVERAGE, type Position,
} from "@/lib/leverage";

const position: Position = {
  side: "yes",        // "yes" | "no"
  margin: 100,        // collateral, USDC
  leverage: 5,        // EFFECTIVE leverage, after tiers
  entryPrice: 0.64,   // market YES probability at entry
};

liquidationPrice(position);        // 0.512  — always in YES terms
unrealizedPnl(position, 0.61);     // −117.19
healthFactor(position, 0.61);      // 0 … 1
payoutAtResolution(position, "yes"); // 381.25
```

```ts
import { MARKET_TIERS, marginRequirement, maxNotionalForMargin } from "@/lib/leverage/tiers";

const notional = maxNotionalForMargin(2000, 20, MARKET_TIERS); // 25000
const req = marginRequirement(notional, 20, MARKET_TIERS);
req.effectiveLeverage; // 12.5
req.slices;            // per-tier breakdown, for showing the user why
```

### Two conventions worth knowing

**Liquidation is always expressed in YES terms**, whichever side you hold, so it
can be compared against the market price shown everywhere else. For a NO
position that price sits *above* entry.

**`lib/leverage/` is pure.** No React, no Solana, no `fetch`, no imports from
elsewhere in the app. That is what makes it testable, and it is intended to
double as the executable specification for the eventual Solana program: the
on-chain maths should produce these same numbers.
