# Design System

Warm-neutral, flat, dual-theme. This file is the human-readable source of truth;
`.claude/skills/design-system/SKILL.md` is the agent-facing summary and defers to
this document where they differ.

Every contrast figure below was computed (sRGB → WCAG relative luminance) and
verified against the surface it actually sits on, in **both** themes. Where a
value from the original palette failed, it is noted rather than quietly changed.

---

## Typography

| Role | Face | Why |
|---|---|---|
| Headline | **TikTok Sans** | Variable (`wght` 300–900). Loaded via `next/font/google`. |
| Body / UI | **Geist** | Loaded from the `geist` npm package, **not** Google Fonts — that build omits the `tnum` and `zero` OpenType features. |
| Numerals | **Geist Mono** | Every value that updates. |

```css
.numeric {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums slashed-zero;
}
```

Applies to every price, PnL, margin, liquidation price and countdown. Fixed
decimal count, `min-width` in `ch`, and reserved space for the sign so crossing
zero doesn't shift a column.

---

## Colour

A warm neutral family (stone, not slate). Dark is **composed**, not inverted —
each step chosen against its own ground and re-verified.

### Light

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#FAFAFA` | Page ground |
| `--surface` | `#FFFFFF` | Cards, panels, inputs |
| `--raised` | `#F4F2F0` | Hover |
| `--text` | `#191513` | Primary text — 17.4:1 |
| `--muted` | `#57534E` | Secondary — 7.3:1 |
| `--faint` | `#78716C` | Tertiary — 4.6:1 |
| `--hairline` | `#D9D3CF` | **Decorative dividers only** |
| `--border` | `#8B827B` | **Control boundaries** — 3.6:1 |
| `--accent` | `#433F3B` | Emphasis, primary action |
| `--long` | `#15803D` | YES / profit — 4.8:1 |
| `--short` | `#B91C1C` | NO / loss — 6.2:1 |
| `--warn` | `#A16207` | Liquidation, caution — 4.7:1 |

### Dark

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#191513` | Page ground |
| `--surface` | `#221E1B` | Cards, panels, inputs |
| `--raised` | `#2B2622` | Hover |
| `--text` | `#FAFAFA` | Primary text — 15.9:1 |
| `--muted` | `#C9C2BC` | Secondary — 9.4:1 |
| `--faint` | `#A8A29E` | Tertiary — 6.6:1 |
| `--hairline` | `#3A3430` | Decorative dividers only |
| `--border` | `#7B7269` | Control boundaries — 3.5:1 |
| `--accent` | `#D9D3CF` | Emphasis, primary action |
| `--long` | `#4ADE80` | YES / profit — 9.5:1 |
| `--short` | `#F87171` | NO / loss — 6.0:1 |
| `--warn` | `#FBBF24` | Liquidation, caution — 9.9:1 |

### Two border tokens, and why it matters

The supplied `#D9D3CF` measures **1.48:1 on white**. WCAG 1.4.11 requires **3:1**
for anything defining an interactive control's edge, and in a flat design the
border *is* the button — there is no shadow doing the work.

So the palette splits it:

- `--hairline` — table row rules, section dividers. Decorative, no minimum.
- `--border` — inputs, buttons, selects, anything pressable. **Must clear 3:1.**

Using `--hairline` on a control is a bug, not a style choice.

### Rules

- Semantic colour is **never the only signal.** Always paired with `+`/`−` and
  `▲`/`▼`. Roughly 8% of men have a red-green deficiency.
- Body text ≥ 4.5:1; controls, icons and focus rings ≥ 3:1. Verify in **both**
  themes — a value that passes on white can fail on `#221E1B`.
- Never derive a dark value by inverting a light one.

---

## Surfaces — flat

No shadows. Depth is expressed by **fill and border**, never elevation.

| Class | Use |
|---|---|
| `.panel` | Container: `--surface` fill, 1px `--hairline`, `--radius-lg`. Not interactive. |
| `.control` | Button, tile, select: `--surface` fill, 1px `--border`, hover swaps fill to `--raised`. |
| `.well-field` | Input: `--bg` fill, 1px `--border`, `padding-inline: 12px`. |

**A control's boundary is its border.** That is the only thing separating it from
the page, so it never drops below 3:1 and is never replaced by a fill difference
alone.

Radius: `--radius-sm 6px` · `--radius-md 10px` · `--radius-lg 14px`.
Table rows and dividers stay at 0 — rows are not objects.

**Focus:** 2px ring in `--accent` at `outline-offset: 2px`. With no shadow behind
it, the offset lands on a known flat colour, so its contrast is predictable.

---

## Motion

### The frequency gate — apply before choosing any animation

| Frequency | Treatment |
|---|---|
| Rare (monthly) | Expressive motion welcome |
| Occasional (daily) | Subtle, fast |
| **Frequent (100s/day)** | **No animation. Stop.** |
| **Keyboard-initiated** | **Never animate.** Not a judgment call. |

Side toggle, leverage slider, tab switch, order confirm and price tick are all
frequent. **Most of this UI does not animate.**

One curve: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`. Never `ease-in` on UI.
Durations: press 100–160ms · tooltip 125–200ms · dropdown 150–250ms · modal
200–500ms. Under 300ms. Exit faster than enter. Springs default to `bounce: 0`.

### Live values

- Hold live values in a **`MotionValue`**, never React state. Flush once per frame.
- **Never put a ticking number inside `layout`/`layoutId`** — forces a measure
  pass across the tree on every change.
- Bars animate `transform: scaleX()`, never `width`.
- **WCAG 2.3.1 caps flashing at 3/second.** Rate-limit change-tint to ≤2/sec per
  cell. This is a seizure-risk failure, not a preference.

---

## Charts

- Single series → no legend; the surrounding card names it.
- Colour follows direction, always paired with a `▲`/`▼` and a signed delta.
- **A series must end at the value printed beside it.** A chart that disagrees
  with its own number is worse than no chart.
- Floor the vertical domain so a small move isn't rendered as a dramatic one.
- Crosshair snaps to the nearest point; keyboard gets what hover gets.
- Canvas cannot read CSS custom properties in `oklch()`/`lab()` — Lightning CSS
  rewrites them at build time and third-party parsers reject the result. Charts
  read the **plain-hex `--chart-*` mirrors** instead, and rebuild on theme change.

---

## Forbidden

- **Any pulsing indicator** — `animate-pulse`, `@keyframes pulse|glow|breathe`.
  Every instance; there is no acceptable frequency.
- `transition: all`; `ease-in` on UI; `transform: scale(0)` entrances.
- Animating `width`/`height`/`margin`/`padding`/`top`/`left`, or `box-shadow`.
- Stagger on table rows. Any stagger in a data table.
- `--hairline` used as a control boundary.
- Gradient text, aurora/shimmer/beam, scanlines, neon glow.
- Decorative backgrounds behind data.
- Emoji or Unicode glyphs standing in for an icon system — use Lucide.
- Placeholder-as-label. Spinners where a skeleton belongs. Arbitrary `z-50`.
- **Risk information behind a disclosure.** Liquidation price, max loss and
  health are visible at the moment of decision. *Modelling caveats* may be
  collapsed; the numbers themselves may not.
- **Fake-precise numbers** — any figure must be real or explicitly labelled mock.
  (The page-level demo banners were removed by product decision; see CLAUDE.md.)

---

## Stack

| Need | Choice |
|---|---|
| Animation | Motion, imported from `motion/react` only |
| Icons | Lucide |
| Charts | `lightweight-charts` (TradingView) for candles; hand-rolled SVG for sparklines |
| Toasts | Sonner, headless via `toast.custom` |
| Fonts | `next/font/google` for TikTok Sans; `geist` npm package for Geist |

**Turbopack:** Next 16 defaults to it, and mixing imports from the `motion`
barrel and `motion/react` produces two module instances in production — layout
animations silently no-op while dev works fine.
