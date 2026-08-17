---
name: design-system
description: Use when building, styling, or reviewing ANY UI in this project — screens, components, colors, typography, spacing, motion, numeric displays, tables, charts, or icons. Contains the committed design tokens, the animation frequency gate, the forbidden-patterns list, and the approved library stack for this leveraged prediction market terminal.
---

# Design System — Leveraged Prediction Market

Dark trading terminal. Hyperliquid / Drift / GMX, not Robinhood, not a memecoin launchpad.

Every value here was decided, not defaulted. Don't substitute alternatives without a stated reason.

## The one-line test

**Would this belong on a page where a wrong number costs someone their position?**

Decoration that competes with data is a defect here, not a matter of taste. The user's eye must go to the number.

## Color

Near-black ground, hairline separation, color reserved almost entirely for semantics.

```css
:root {
  --bg:             #020617;  /* app ground */
  --surface:        #0B0F1D;  /* panels, table rows */
  --surface-raised: #141A2B;  /* hover, selected row */

  --hairline:       #1E2739;  /* 1px dividers — the primary separator */
  --border:         #2A3446;  /* input borders */

  --text:           #F8FAFC;
  --text-muted:     #94A3B8;  /* labels, secondary */
  --text-faint:     #64748B;  /* timestamps, disabled */

  --long:           oklch(0.72 0.17 150);  /* YES / long */
  --short:          oklch(0.72 0.17 25);   /* NO / short */
  --warn:           oklch(0.78 0.16 75);   /* liquidation proximity */
}
```

**Why long and short share identical OKLCH lightness and chroma.** A saturated green and a saturated red at the same *hex* brightness are not equally bright *perceptually* — red reads heavier on a dark ground. Matching L and C means neither side of the book looks louder than the other. Verify final values against the real background in-browser; these are the intended ramp, not measured output.

**There is no decorative accent color.** The primary action color derives from the side the user picked — green when going long, red when going short. Introducing a brand purple or blue spends the one signal traders read fastest.

Rules:
- No pure `#000` or `#fff`. Pure values kill depth.
- Compose the dark palette explicitly. Never mechanically invert a light theme.
- Prefer explicit colors over stacked translucent overlays — alpha makes contrast context-dependent, and row hover states stack.
- Body text ≥4.5:1, large text ≥3:1, **controls / icons / focus rings ≥3:1**. Verify in the dark theme specifically; mid-greens routinely fail.

## Typography

**Geist Sans** (UI) + **Geist Mono** (all numerics). Both SIL OFL 1.1.

```bash
npm i geist
```
```ts
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
```

**Install the npm package, never Google Fonts.** The Google Fonts distribution of Geist does not expose the `tnum` and `zero` OpenType features this project depends on. `next/font` also self-hosts, giving zero layout shift and no external request.

They were designed together and share metrics, so a mono price column optically aligns with the sans label beside it.

Mono is for **numbers, data, and measurement only**. Mono body copy is a costume.

## Numbers — the core competence

Every price, PnL, margin, liquidation price, and countdown:

```css
.numeric {
  font-family: var(--font-geist-mono);
  font-variant-numeric: tabular-nums slashed-zero;
}
```

- Use `font-variant-numeric`, not raw `font-feature-settings` — the latter silently clobbers other features when re-declared.
- **Fixed decimal count** and a `min-width` in `ch`. A `2` becoming a `7` must not change measured width.
- **Reserve space for the sign** so crossing zero doesn't shift the column.
- Never encode gain/loss with color alone. Always pair with `+`/`−` and `▲`/`▼`.

## Motion

### The frequency gate — apply this first, before choosing any animation

| Frequency | Treatment |
|---|---|
| Rare (monthly) | Expressive motion is welcome |
| Occasional (daily) | Subtle, fast |
| **Frequent (100s/day)** | **No animation. Stop here.** |
| **Keyboard-initiated** | **Never animate.** Not a judgment call. |

In this app the side toggle, leverage slider, tab switches, order confirms and price ticks are all in the "frequent" band. **Most of this UI gets no animation at all.** Raycast ships with no open/close animation; that is the target feel.

### Tokens

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
```

One curve. Built-in CSS easings are too weak. **Never `ease-in` on UI** — it delays the exact moment the user is watching; `ease-out` at 200ms *feels* faster than `ease-in` at 200ms.

| Element | Duration |
|---|---|
| Button press feedback | 100–160ms |
| Tooltip, small popover | 125–200ms |
| Dropdown, select | 150–250ms |
| Modal, drawer | 200–500ms |

UI animations stay **under 300ms**. Exit faster than enter (~60–70%). Springs default to `bounce: 0`.

### Live-updating values

- Hold each live value in a **`MotionValue`**, never React state. Motion values write the DOM without a re-render.
- Coalesce incoming feed messages into a ref and flush **once per animation frame**. Feed rate and paint rate are unrelated.
- Write text by subscription: `useMotionValueEvent(mv, "change", v => { ref.current.textContent = fmt(v) })`.
- Wrap PnL/equity in `useSpring` (~`{stiffness: 200, damping: 40}`) so values glide between ticks. This reads as "live" **without any per-digit motion** — it is what Hyperliquid and Drift actually do.
- Health / liquidation bars: animate `transform: scaleX()`, never `width`.
- **Never put a ticking number inside a `layout` or `layoutId` container.** Every value change triggers a measure pass across the tree. This is the single biggest performance trap available here.

### Flash-on-change is a safety issue, not a style choice

**WCAG 2.3.1 sets the threshold at 3 flashes per second.** An uncapped up/down tint across a table of live rows exceeds it — a literal seizure-risk failure.

- Tint the **cell background**, never the digits: 150–250ms, ease-out, peak opacity ~0.15.
- **Rate-limit to ≤2 flashes/sec per cell**, or drop the flash entirely and let the spring-eased value carry the change.
- Prefer persistent encoding (green/red text for PnL sign) over transient. The flash is the first thing to cut.

### Reduced motion

```tsx
<MotionConfig reducedMotion="user">   // default is "never" — you MUST set this
```

**`MotionConfig` only disables transform and layout animations.** `opacity` and `backgroundColor` keep animating — so the flash tint keeps firing. Gate it manually with `useReducedMotion()`.

Under reduced motion: drop spring easing, flash, and digit rolls — but **keep the liquidation state change** as a static border/label/color change. Reduced motion means less movement, not less information. That distinction matters more here than in most apps, because the motion conveys a financial event.

## Density

This is a cockpit, not a landing page.

- **No cards.** At this density generic card containers are banned; nested cards are always wrong. Separate rows with 1px hairlines and negative space.

  **Documented exception — the markets browse grid only.** `app/page.tsx` uses a card
  grid, matching Polymarket and Kalshi. Browsing is a *scanning* task, not a monitoring
  task: users need the market image, room for a full question, and a large tap target.
  This exception does **not** extend to the positions table, the trade panel, the order
  history, or any surface showing live values — those stay hairline-separated rows.
  Nested cards remain wrong everywhere, including inside a market card.

- `--radius: 0` or near-zero. Squared corners suit a terminal.
- Tight padding. Density is the point.
- More space above a heading than below it.
- Pick one corner-radius scale and one icon stroke weight. Mixed systems need a documented rule.
- Skeleton loaders shaped like the final layout. **Never generic spinners.**
- Label above input, error below. **No placeholder-as-label, ever.**
- Risk information is never behind a disclosure. Liquidation price and health are visible at the moment of decision.

## Theme the surfaces you didn't draw

The cheapest signal a page was built rather than assembled, and the one AI reliably skips: **text selection, caret color, scrollbars, focus rings, underline offset, and tabular numerals.** All ship with browser defaults belonging to no design system. Theme them from the palette.

## Approved stack

| Need | Choice | Note |
|---|---|---|
| Animation | **Motion** (`motion/react`) | The only engine. See Turbopack note below. |
| Base components | **shadcn/ui** | Already Tailwind v4 + React 19 native |
| Tables | **TanStack Table** | No registry ships a real grid |
| Number transitions | **`@number-flow/react`** | |
| Icons | **Lucide** | Brand marks removed in v1.0 — Solana/Phantom/Polymarket need a hand-maintained `icons/brands/` |
| Charts | **Bklit UI** (MIT, visx) | Only source with real candlestick + live-line primitives; Recharts has no candlestick at all |
| Fonts | **`geist`** npm package | |

**Turbopack warning:** Next 16 uses Turbopack by default, and mixing imports from the `motion` barrel and `motion/react` produces two module instances in production — layout animations silently no-op while dev works fine. **Import from `motion/react` everywhere.**

### Cherry-pick sources (copy individual files, never adopt as a system)

- **Watermelon UI** — `scrub-slider` (leverage slider), `input-mask-*` (size fields), sliders' unstyled `-base` variants. Mixes Base UI + Radix + React Aria, so check each item's deps.
- **SmoothUI** — `price-flow`, `skeleton-loader`, `exposure-slider`, `animated-progress-bar`.
- **Cult UI** — `direction-aware-tabs`, `floating-panel`, `animated-number`.
- **componentry.dev** — `command-menu` (⌘K market switcher), `scrub-input`.
- **VengeanceUI** — `kbd` (hotkeys), `copy-button` (wallet addresses).

## Forbidden

Reject on sight:

- **Any pulsing indicator.** `animate-pulse`, `@keyframes pulse|glow|breathe|throb` on status dots. Flag every instance — there is no acceptable frequency. You will have a dozen "live" positions at once.
- `transition: all` — name the exact properties.
- `ease-in` on any UI element.
- `transform: scale(0)` entrances — use `scale(0.95)` + `opacity: 0`.
- Animating `width` / `height` / `margin` / `padding` / `top` / `left`.
- Motion's `x` / `y` / `scale` shorthand props under load — **not hardware-accelerated**, they run on the main thread. Use a full `transform` string.
- Driving a child's transform from a CSS variable on the parent — recalculates styles for every child.
- `requestAnimationFrame` loops that touch React state.
- Stagger on table rows. Any stagger in a data table.
- Bounce/elastic easing on utility actions.
- ≥4 components sharing an identical entrance animation. Three is polish; four is uniformity slop.
- ≥3 components sharing the same hover `scale()`.
- Motion-on-mount for static content (`<h1>`, `<p>`, `<nav>`).
- Gradient text, glow effects, aurora/shimmer/beam decoration, animated gradient borders.
- Scanlines, glitch effects, neon text-shadow. This is a financial product.
- Decorative SVG backgrounds behind data — they destroy the contrast ratio of a PnL number against its ground.
- Hard offset shadows (`box-shadow: 4px 4px 0`).
- Colored `border-left` above 1px on rows or alerts.
- Emoji or Unicode glyphs standing in for an icon system.
- A kicker/eyebrow above a heading.
- Sparklines and progress rings standing in for content.
- **Fake-precise numbers.** Any figure must come from real data or be explicitly labeled mock.
- Arbitrary `z-50` / `z-10` spam. Use a defined scale.

## Related

Deeper guidance is installed as skills — use them:
- `animate`, `review-animations`, `improve-animations` — Emil Kowalski's numeric system; the authority when this file is silent on motion.
- `impeccable` — `/impeccable audit` and `/impeccable polish`; 59 deterministic rules, runs without an API key.
- `design-motion-principles` — AI-slop audit thresholds.
