@AGENTS.md

# Leveraged Prediction Market (BNB Chain)

A prediction market where users bet on real-world outcomes **with up to 20x leverage**.
The leverage is the product — plain prediction markets already exist; this one lets a
trader put up small margin, take a large position on an outcome, and get liquidated if
the odds move against them before resolution.

## Current status — read this before assuming anything exists

**Frontend MVP in progress.** Built and working:

- **Markets browse** — [app/page.tsx](app/page.tsx), 8 cards from 76 mock markets, each with a
  30-day sparkline (hover/keyboard crosshair). Server-side search and category / sort /
  liquidity filters as a plain GET form, no client JS.
- **Market detail** — [app/markets/[slug]/page.tsx](app/markets/[slug]/page.tsx): TradingView
  candles (`lightweight-charts`) with live entry and liquidation price lines, plus the trade
  panel. Unknown slugs correctly 404.
- **Leverage maths** — [lib/leverage/](lib/leverage/), pure and test-driven. 43 Vitest tests
  (`npm test`), including tier blending checked against Robinhood's published figures.
- **Tiered margin** — [lib/leverage/tiers.ts](lib/leverage/tiers.ts). Larger positions fall into
  tiers permitting less leverage; each slice charged at its own rate. All downstream maths uses
  EFFECTIVE leverage, never the selected value.
- **Positions** — opened from the trade panel into `localStorage`
  ([lib/positions/store.ts](lib/positions/store.ts)), valued live on
  [app/portfolio/page.tsx](app/portfolio/page.tsx) with PnL, liquidation and health.
- **Nav + wallet** — **Privy** owns connection and auth; wagmi still does all chain reads.
  Privy covers injected wallets, WalletConnect, email and social login, and mints an embedded
  wallet for users arriving without one. The network badge is derived from the chain the wallet
  reports, never hardcoded. **The settlement asset is chain-dependent** — USDT on BNB mainnet,
  TUSD on BNB testnet — because those are the tokens predict.fun's exchange actually accepts as
  collateral. BNB is gas only. Opening a position is gated on holding enough collateral.

  **Never hardcode the collateral ticker.** It differs by chain, so `useBalances()` returns
  `collateralSymbol` alongside the amount and every screen renders that. Both tokens are 18
  decimals, unlike the 6 USDC uses on Ethereum and Solana. Addresses, symbols and decimals in
  [lib/wallet/collateral.ts](lib/wallet/collateral.ts) were each read back on-chain — the SDK
  labels the testnet slot "USDT" but the contract reports TUSD, and the contract wins.

  We previously read a USDC contract here. It was wrong: predict.fun would never settle in it,
  so the trade panel gated on a balance the venue does not accept.

- **Faucet** — [app/faucet/page.tsx](app/faucet/page.tsx). Testnet only, and the nav link is
  hidden on mainnet. Two steps, because they are genuinely different problems: gas cannot be
  minted (link out to the BNB faucet), while the testnet collateral token exposes a
  permissionless `allocateTo(address,uint256)` that we call directly with the connected wallet
  for 1,000 tokens. Verified: an unrelated caller gas-estimates at ~34k, so it is not
  owner-gated. Mainnet USDT has no such function, which is why `faucetFor()` is keyed by chain.

  **This is the app's only write transaction.** Everything else is read-only. If you add
  more, follow the same shape — `useWriteContract` + `useWaitForTransactionReceipt`, with
  distinct copy for signing / confirming / failed, and refetch balances in an effect keyed on
  the tx hash (never in render).

### Privy — rules that are not optional

- **Import `createConfig` and `WagmiProvider` from `@privy-io/wagmi`, never from `wagmi`.**
  The wagmi ones compile fine and then silently leave wagmi unaware of whichever wallet Privy
  connected. Provider order is fixed: `PrivyProvider > QueryClientProvider > WagmiProvider`.
- **No `connectors` in the wagmi config.** Privy owns connection; listing connectors makes the
  two fight over the active account.
- **Privy mounts client-side only.** PrivyProvider *throws* on a bad App ID, and during SSR that
  throw is unrecoverable — Next reports it as a `client_error` and turns every route into a 500,
  markets and docs included. An error boundary does not help there; verified. The provider is
  deferred past hydration (`useSyncExternalStore`, not `setState` in an effect — React 19's
  `set-state-in-effect` rule), and a boundary catches the same failure on the client where it
  IS recoverable.
- **The wallet must never take down read-only surfaces.** Markets, charts, docs and the
  portfolio all work signed out. `components/wallet/availability.tsx` distinguishes
  `unconfigured` (no App ID) from `failed` (App ID rejected) so the nav says which.
- **Two `ox` majors coexist on purpose, and the layout is load-bearing.**
  `permissionless` (the ERC-4337 library behind smart wallets) imports bare `ox` in its Kernel
  and Safe account paths and needs `^0.8`; viem 2.55 imports `ox/erc8010`, which only exists in
  `0.14`. The working arrangement is: **`ox@0.8.9` as a direct root dependency** (what
  permissionless resolves) plus **`overrides.viem.ox = "0.14.33"`** (viem keeps its own nested
  copy). Collapsing these to one version breaks whichever package loses — a single hoisted
  `0.8.9` fails the build with `Can't resolve 'ox/erc8010'`. `viem` is also pinned to the exact
  version `@privy-io/wagmi` requires.

- **`target` in tsconfig is `ES2020`, not Next's default `ES2017`** — viem's API is bigint-native
  and BigInt literals need ES2020. If a stale `tsconfig.tsbuildinfo` makes tsc disagree with the
  file, delete it.
- `NEXT_PUBLIC_PRIVY_APP_ID` is public by design (it identifies the app, authorises nothing) —
  unlike `PREDICT_API_KEY`, which must stay server-side.

### Smart wallets & gas sponsorship

Embedded-wallet users get an ERC-4337 smart account with sponsored gas, so they can be funded
and trade without ever holding BNB. External wallets (MetaMask etc.) are unaffected and still
pay their own gas.

**Privy's NATIVE sponsorship does not cover BNB testnet (97)** — only mainnet (56). Testnet
therefore goes through smart wallets with our own bundler/paymaster.

- `SmartWalletsProvider` sits directly under `PrivyProvider`;
  [components/wallet/smart-wallet.tsx](components/wallet/smart-wallet.tsx) bridges its state
  into our own context so components outside the Privy tree (App ID missing or rejected) get an
  empty state instead of a thrown hook.
- **The smart account address is NOT the embedded EOA.** The EOA only signs; the smart account
  holds funds. `useBalances().address` returns the effective account and everything that
  receives or spends tokens must use it — funding one address and trading from another is the
  obvious failure here.
- The faucet prefers `sendSponsored` when a smart account exists and falls back to
  `useWriteContract` (user pays) otherwise, so both wallet types work from one button.

**Dashboard configuration is required and lives outside this repo.** In the Privy dashboard:
enable smart wallets, pick an account implementation (Kernel/Safe/Biconomy/Alchemy/Thirdweb/
Coinbase), then add chain 97 with a bundler URL, paymaster URL and RPC URL — none of those can
be defaulted for a custom chain. Pimlico supports 97 as `binance-testnet`. Without a paymaster
configured the code still works; the smart account just pays its own gas.
- **Theming** — light and dark, switchable from the nav, persisted to `localStorage` with an
  inline pre-paint script so there is no flash. Both palettes contrast-verified.

Not built: closing a position with realised PnL, market resolution/settlement, fees, funding
rates, and the maintenance-margin cushion (our liquidation price is still the *bankruptcy*
price — see the note in lib/leverage).

**The on-chain contract does not exist and is out of scope.** Do not write Solidity or
on-chain integration until explicitly asked. This is a frontend project right now.

**Pivoted from Solana to BNB Chain.** Market data is now live from predict.fun; the wallet
is EVM (wagmi + viem, BNB Smart Chain). There is no Solana code left — do not reintroduce
`@solana/*`, Anchor, or an SPL token path.

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
wagmi + viem + TanStack Query for the wallet. No `src/` directory — the app router lives
at [app/](app/).

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
4. **Wallet connect** — EVM wallet (wagmi/viem) on BNB Smart Chain, address + balance,
   trading gated on connection.

Out of scope for now: leaderboard, social/share cards, real on-chain execution, order books,
multi-outcome (non-binary) markets.

## Data sources — live, from predict.fun

**Market data is real.** Questions, prices, volumes, categories and price history all come
from the predict.fun REST API (BNB Chain) at request time. `MarketPage.isMockData` is now
`false`, and no screen fabricates a figure.

**Positions are still simulated.** Opening a position writes to `localStorage`; no order is
routed and no money moves. The trade panel says so.

- The observed API contract is documented in
  [../predict-fun-explorer/SCHEMA.md](../predict-fun-explorer/SCHEMA.md) — written from real
  responses, not from vendor docs. **Read it before touching `lib/predict/`.**
- `lib/predict/` is the raw HTTP client: rate limiter, retry, typed parse.
- `lib/data/predict/` is the adapter that maps the API onto our `Market` type.
- The mock catalogue in `lib/data/mock/` is retained as an offline fallback. Set
  `NEXT_PUBLIC_USE_MOCK_DATA=1` to use it.

### Testnet / mainnet switch

The navbar carries a **Data** toggle (`components/nav/network-switch.tsx`). It changes which
predict.fun network the app READS FROM — it is not the wallet's chain, and the two can
legitimately disagree.

- The choice is a cookie, read server-side by `lib/data/network.ts`, flipped by the Server
  Action in `app/actions/network.ts`. It has to be server-side because the API key must never
  reach the browser.
- `getMarketsClient()` returns a client bound to that network. There is no module-level
  client — a singleton would pin whichever network was selected at first evaluation.
- **The catalogue cache is keyed by network.** A shared slot would serve testnet's markets
  after a switch to mainnet, silently and looking correct.
- **Mainnet requires `PREDICT_API_KEY`.** Every route — markets, categories, tags, quotes —
  returns `401 authorization error` without one; verified directly. Testnet reads are
  completely open. The toggle marks mainnet with an asterisk when no key is configured and
  the page explains what to set, rather than surfacing a bare 401.

### API traps that have already cost time

Every one of these was hit for real. They are silent failures, not errors:

- **Page size is `first`.** `limit`, `pageSize` and `take` are ignored — you get 20 rows and
  no error.
- **Cursor asymmetry.** You read `cursor` from the response and send it back as `after`.
- **`status` means two things.** The filter enum is `OPEN|RESOLVED`; the field returns
  `REGISTERED|…|RESOLVED`. Filtering by a value you just read returns zero rows silently.
- **Timeseries `y` is a whole-number percentage** (49 means 49%), while every other price is
  in [0, 1]. Convert exactly once, at the adapter boundary.
- **Timeseries caps at 250 points per market regardless of `limit`, and drops the NEWEST
  points.** An unpaginated hourly request for a month returns the first ten days and looks
  perfectly healthy while being weeks stale. Paginate, or use a resolution that fits.
- **Markets carry no close time.** `endsAt` lives on the *category*; a market only points at
  one by `categorySlug`. Some categories have no tags and no `endsAt` at all.
- **`/categories` 500s on any `sort` value**, leaking a Postgres error about a missing
  materialized view. Unsorted works.
- **`/search` returns 500** — broken upstream. We filter in memory instead.

Previously we pulled from Polymarket and removed it: it is Polygon/USDC (so its IDs never
mapped onto our chain), and it is DNS-blocked by Malaysian ISPs.

## Architecture rules

**1. `lib/leverage/` is pure.** No React, no chain code, no `fetch`, no imports from anywhere
else in the app. Just functions over numbers: margin, liquidation price, PnL, health, fees.
It is the one thing here that can be wrong without looking wrong on screen — so it is
also the one thing that must be test-driven. It doubles as the executable spec for the
future BNB Chain contract.

**2. UI never touches a data source directly.** All data access goes through typed interfaces
in `lib/data/clients.ts`. Components consume the interface; adapters implement it. The adapter
is chosen in exactly one place, [lib/data/index.ts](lib/data/index.ts) — import `marketsClient`
from there, never an adapter by name.

This has now been exercised three times (live Polymarket → mock → live predict.fun). The
predict.fun swap needed no component changes except removing one leak: `market-card.tsx` was
importing `priceHistoryFor` straight from the mock module, so sparklines could never show
anything but fabricated history. **Price history and candles now come through the interface**
(`getHistories`, `getCandles`). Don't reintroduce a direct import.

**Categories are data, not a constant.** The old hardcoded list of eight is gone; the filter
bar renders whatever the source actually returns, via `MarketPage.categories`.

**3. Money and probability are never raw floats in the UI.** Format through shared helpers so
prices, percentages, and PnL render consistently everywhere.

**4. No root `app/loading.tsx`.** It creates a Suspense boundary above every route, so Next
streams a `200` header before a nested `notFound()` can set the status — `/markets/<bad-slug>`
answered `200` while rendering the 404 page. Verified by removing it: the same request then
returned `404`. Data is in-memory and synchronous, so the boundary bought nothing anyway. If a
route ever needs a loading state, scope it to that route, not the root.

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
    index.ts                    adapter selection — import marketsClient from here
    predict/                    live predict.fun adapter
    mock/                       fabricated fallback (NEXT_PUBLIC_USE_MOCK_DATA=1)
  wallet/                       BEP-20 USDC token config
  chain/                        wagmi config, BNB network labels
  predict/                      raw predict.fun HTTP client
components/
  ui/                           style-only primitives
  trade/                        trade panel, leverage slider, liq. readout
  market/                       market cards, odds display
```

## Design direction

**Warm-neutral, flat, dual-theme.** TikTok Sans headlines, Geist body, Geist Mono numerals.
Light and dark are both first-class, switchable from the nav.

**[DESIGN.md](DESIGN.md) at the repo root is the source of truth.** Read it before styling
anything; `.claude/skills/design-system/SKILL.md` is a short agent summary that defers to it.

The four rules worth carrying in your head:

- **No shadows.** Depth is fill and border. A control's boundary IS its border.
- **Two border tokens.** `--hairline` is decorative; `--border` is for interactive edges and
  must clear 3:1. Using the wrong one is a bug, not a style choice.
- **Most of this UI does not animate.** Anything triggered 100+ times/day — leverage slider,
  side toggle, tab switch, order confirm, price tick — gets no animation.
- Green/red is never the only signal. Always pair with `+`/`−` and a direction glyph.

For design decisions, reviews, or when something feels off, delegate to the
**`design-director`** agent.

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
