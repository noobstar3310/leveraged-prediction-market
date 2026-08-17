@AGENTS.md

# Leveraged Prediction Market (Solana)

A prediction market where users bet on real-world outcomes **with up to 20x leverage**.
The leverage is the product — plain prediction markets already exist; this one lets a
trader put up small margin, take a large position on an outcome, and get liquidated if
the odds move against them before resolution.

## Current status — read this before assuming anything exists

**Frontend MVP, pre-first-feature.** The repo is a bare `create-next-app` scaffold:
[app/page.tsx](app/page.tsx), [app/layout.tsx](app/layout.tsx), [app/globals.css](app/globals.css).
Nothing below under "Planned structure" has been built yet. Verify before you reference a path.

**The Solana program does not exist and is out of scope.** Do not write Anchor code,
Rust, or on-chain integration until explicitly asked. This is a frontend project right now.

## Domain model

Perp-style margin, not a simple parlay. Get this vocabulary right — it drives every screen.

- **Market** — a binary outcome question ("Will X happen by date D?") with a current
  probability, expressed as a price between 0 and 1. `0.64` means the market prices YES at 64%.
- **Position** — a leveraged bet on YES or NO. Has a side, size, entry price, margin, and leverage.
- **Margin** — collateral the user actually puts up. `margin = size / leverage`.
- **Leverage** — 1x to 20x. Higher leverage means less margin and a closer liquidation price.
- **Liquidation price** — the outcome price at which margin is exhausted and the position is
  force-closed at a total loss. A 20x YES position entered at `0.64` liquidates after roughly a
  3% adverse move. This is why liquidation must always be visible before a user confirms.
- **Unrealized PnL** — mark-to-market profit/loss while the market is still open.
- **Early close** — positions can be closed before resolution at the current price.
- **Resolution** — the market settles YES or NO; surviving positions pay out or go to zero.

A user can lose everything **before** the event resolves. That is the core risk the UI
must communicate, and it is the main thing that distinguishes this from Polymarket.

## Stack

Next.js 16.3.1 (App Router) · React 19.2.8 · TypeScript · Tailwind v4 · ESLint.
No `src/` directory — the app router lives at [app/](app/).

**Next.js 16 differs from most training data.** Read the relevant guide in
`node_modules/next/dist/docs/` before writing routing, caching, server component, or
data-fetching code. Do not pattern-match from Next 13/14 memory.

## MVP scope

In scope:
1. **Markets list** — browse markets with category, volume, close time, current odds.
2. **Market detail + trade panel** — side toggle, size input, leverage slider,
   live liquidation price and payout preview, confirm.
3. **Portfolio** — open positions with unrealized PnL, health / liquidation proximity,
   close action; plus settled position history.
4. **Wallet connect** — Solana wallet adapter, address + balance, trading gated on connection.

Out of scope for now: leaderboard, social/share cards, real on-chain execution, order books,
multi-outcome (non-binary) markets.

## Data sources — everything is mocked

**All data is fabricated.** Markets, prices, volumes, close dates, wallet balance, positions,
PnL. There is no live data source and no network call anywhere in the app.

Market fixtures live in [lib/data/mock/markets.ts](lib/data/mock/markets.ts). They are
deterministic — no `Date.now()`, no randomness — so a market always renders identically.

**Any screen showing fabricated figures must say so.** `MarketPage.isMockData` drives a visible
notice on the markets page. This is a design-system rule, not a preference: presenting invented
prices as real is the one thing a trading UI must never do. The flag flips to `false` on its own
once a real adapter backs the interface, and the notice disappears with it.

We previously pulled live market data from Polymarket and removed it. Two reasons worth
remembering before anyone suggests putting it back: Polymarket is Polygon/USDC, so its IDs and
prices would never map onto our Solana program; and it is DNS-blocked by Malaysian ISPs, so it
does not resolve on the primary dev machine without a VPN or a DNS override.

## Architecture rules

**1. `lib/leverage/` is pure.** No React, no Solana, no `fetch`, no imports from anywhere else
in the app. Just functions over numbers: margin, liquidation price, PnL, health, fees.
It is the one thing here that can be wrong without looking wrong on screen — so it is
also the one thing that must be test-driven. It doubles as the executable spec for the
future Solana program.

**2. UI never touches a data source directly.** All data access goes through typed interfaces
in `lib/data/`. Components consume the interface; adapters (mock now, Anchor later) implement it.
Swapping the backend must not mean touching components — this has already been exercised once,
replacing a live adapter with the mock one without changing a single component.

**3. Money and probability are never raw floats in the UI.** Format through shared helpers so
prices, percentages, and PnL render consistently everywhere.

## Planned structure — build toward this

```
app/
  markets/page.tsx              markets list
  markets/[id]/page.tsx         detail + trade panel
  portfolio/page.tsx            open + settled positions
  api/markets/route.ts          markets as JSON, for future client-side refresh
lib/
  leverage/                     PURE math — TDD, no framework imports
  data/
    clients.ts                  typed interfaces — the seam
    mock/                       markets, account balance, positions (all fabricated)
  wallet/                       Solana wallet adapter setup
components/
  ui/                           style-only primitives
  trade/                        trade panel, leverage slider, liq. readout
  market/                       market cards, odds display
```

## Design direction

**Dark trading terminal** — Hyperliquid / Drift / GMX, not Robinhood, not a memecoin launchpad.

**Before writing or styling any UI, read `.claude/skills/design-system/SKILL.md`.** It holds the
committed tokens, the animation frequency gate, the forbidden-patterns list, and the approved
library stack. It is a decision record, not suggestions — don't substitute alternatives without
a stated reason.

The four rules worth carrying in your head:

- Near-black ground, hairline dividers, **no cards** at this density.
- Tabular monospace numerals on every value that updates.
- **Most of this UI does not animate.** Anything a user triggers 100+ times/day — leverage
  slider, side toggle, tab switch, order confirm, price tick — gets no animation.
- Green/red is never the only signal. Always pair with `+`/`−` and a direction glyph.

For design decisions, reviews, or when something feels off, delegate to the **`design-director`**
agent — it holds the full system and returns binding verdicts.

## Chosen libraries — decided, not yet installed

| Need | Choice |
|---|---|
| Animation | Motion — import from `motion/react` **only** (Turbopack makes mixed imports silently break) |
| Base components | shadcn/ui |
| Tables | TanStack Table |
| Number transitions | `@number-flow/react` |
| Icons | Lucide (brand marks need a hand-maintained `icons/brands/`) |
| Charts | Bklit UI (visx) — the only MIT source with real candlestick primitives |
| Fonts | `geist` npm package, **not** Google Fonts (that build lacks the `tnum`/`zero` features) |

## How to work here

- **TDD is required in `lib/leverage/` only.** Write the failing test first. Everywhere else —
  components, layout, styling — iterate fast and verify visually.
- Everything else stays loose on purpose. Don't add component tests to MVP UI that will be
  redesigned; don't ceremonialize a styling change.
- Prefer editing existing files over adding new ones. Keep files focused — a large file
  is usually a boundary problem.
- Don't build the leaderboard, backend, or on-chain layer "while you're in there".

## Commands

```
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint
```
