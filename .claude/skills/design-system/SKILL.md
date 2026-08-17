---
name: design-system
description: Use when building, styling, or reviewing ANY UI in this project — screens, components, colors, typography, spacing, motion, numeric displays, tables, charts, or icons. Contains the committed design tokens, the elevation budget, the animation frequency gate, the forbidden-patterns list, and the approved library stack for this leveraged prediction market.
---

# Design System — Leveraged Prediction Market

**Dark neumorphic / soft UI.** Extruded controls on a mid-tone ground, with a uniform
grid of market cards.

Every value here was decided and verified, not defaulted. Contrast figures were
computed from OKLCH → sRGB → WCAG relative luminance and independently re-checked.
Don't substitute alternatives without a stated reason.

## The rule the whole system rests on

**Depth is scarce and it means exactly one thing: "you can touch this."**

Static content — headings, labels, table rows, every price, PnL and liquidation
number — sits **flat with zero shadow**. Only interactive elements are extruded or
recessed. This inverts default soft UI, where everything is puffy and therefore
nothing reads as a control.

Two hard problems solve themselves as a result:
- **Affordance:** if it has depth, it's interactive. No ambiguity, because there is
  no decorative depth.
- **Depth never competes with data:** data has no depth. It cannot compete.

## The one-line test

**Would this belong on a page where a wrong number costs someone their position?**

## Color

The ground is `oklch(0.285)`, deliberately not near-black. **Below roughly L 0.24 the
light shadow lobe has no headroom** and you get a drop shadow instead of an
extrusion — soft UI is impossible on a near-black canvas.

```css
--ground:   oklch(0.285 0.012 265);  /* #272A30  app plane, resting control fill */
--panel:    oklch(0.305 0.012 265);  /* #2C2F35  raised panel */
--well:     oklch(0.255 0.013 265);  /* #202329  recessed well */
--hover:    oklch(0.320 0.014 265);  /* #2F333A  see the cap below */

--sh-dark:  oklch(0.165 0.018 265);  /* bottom-right lobe */
--sh-light: oklch(0.410 0.013 265);  /* top-left lobe */
--edge-lit: oklch(0.440 0.014 265);  /* 1px inner top edge */

--rim:      oklch(0.600 0.016 265);  /* control boundary — 3.63:1 on ground */
--hairline: oklch(0.360 0.012 265);  /* row separators */

--foreground: oklch(0.970 0.004 265);
--muted:      oklch(0.780 0.012 265);
--faint:      oklch(0.680 0.016 265);

--long:  oklch(0.72 0.17 150);
--short: oklch(0.72 0.17 25);
--warn:  oklch(0.78 0.16 75);
--focus: oklch(0.90 0.03 250);
```

**`--hover` is capped at L 0.32 and this is load-bearing.** At L 0.34, `--short` on
a hovered row falls to **4.40:1 and fails**. At L 0.32 it is 4.74:1. The failure is
invisible until you hover a red PnL cell. Do not lighten it.

**Long and short share identical L and C** so neither side of the book reads louder.
These values carried over unchanged from the previous flat system. Do not retune.

Verified on real rendered surfaces: foreground 13.19:1, faint 4.97:1, long 6.19:1,
short 5.38:1 (4.74:1 hovered), warn 7.02:1, rim 3.63:1. All pass.

## Elevation

One light source, **top-left, on every element, on every screen.** Dark lobe `+x +y`,
light lobe `−x −y`, blur ≈ 2.3 × offset.

| Token | Use | Size range |
|---|---|---|
| `--elev-1` | control or content tile: button, market card, select | 32–96px |
| `--elev-2` | page-level panel: trade panel, table container, modal | ≥96px, **max 3 per viewport** |
| `--inset-well` | recessed: inputs, slider track, selected toggle side | — |
| `--pressed` | `:active`, applied **instantly**, never transitioned | — |

**Elevation budget, enforced:**
- Max **2 levels** on any path: `ground → panel → well`. Never raised-inside-raised.
- Nothing under **32px** on its smallest axis is ever extruded.
- **`radius ≥ 2 × offset`, floor 8px.** Below that the highlight arc breaks at the
  corner and the extrusion reads as a misprint. Scale: 8 / 12 / 16 / 20. Rows and
  dividers stay at 0 — rows are not objects.

**Depth serves two roles, and confusing them is a bug.** `.control` says "you can
touch this" — it changes cursor, responds to press, and flattens when disabled.
`.panel` is structure: a container that sits above the ground, with no cursor change
and no pressed state, so it never promises interactivity it doesn't have. A card
holding interactive children is a `.panel`, never a `.control`.

**Every interactive element carries an opaque rim.** This is not optional. A soft
shadow is a gradient, and a gradient has no single adjacent colour, so it can never
satisfy WCAG 1.4.11. The rim is what actually defines a control's edge — to a
screen-magnifier user, on a glare-washed laptop, and to an audit. **Neumorphism
without a rim is the failure mode.** Use `.control` and `.well-field`.

**Focus rings get a 2px opaque moat** (`0 0 0 2px var(--ground)`) before the ring.
Without it the ring lands on the shadow gradient, whose local background runs from
`#474A52` to `#0A0E16`, and its contrast becomes a matter of luck.

**Disabled controls lose their depth.** `box-shadow: none`. An extruded disabled
button still says "press me". This is the one place removing depth carries meaning.

**Any well containing text needs `padding-inline ≥ 14px`.** The inset shadow reaches
~13px inward, and `--faint` over the lit lobe measures only 3.06:1.

## Density

Depth attaches to **containers**, and containers are rare — so rows, cells and
numbers keep the old flat density exactly. You pay the depth tax once per container,
never once per row.

- **Positions table:** one E2 panel wraps it, `padding: 6px`. Inside: a well, then
  flat rows at 40px. A 20-row table costs +12px of chrome total.
- **Trade panel:** one E2 panel, 20px padding, input groups as wells. The
  **liquidation readout is flat text** — most important number on screen, zero depth.
- **Browse grid:** loose (20px tile padding, 16px gap). Scanning is the task; this is
  the only place density yields.
- **The nav gets no depth.** A sticky extruded bar casts a lobe onto whatever scrolls
  under it — a moving contrast gradient across live numbers.

## Typography and numbers

**Geist Sans** + **Geist Mono**, both OFL. Install the `geist` npm package, **not**
Google Fonts — that distribution omits the `tnum` and `zero` OpenType features.

Every price, PnL, margin, liquidation price and countdown:

```css
.numeric { font-family: var(--font-mono); font-variant-numeric: tabular-nums slashed-zero; }
```

Fixed decimal count, `min-width` in `ch`, reserved space for the sign so crossing
zero doesn't shift the column. Never encode gain/loss with colour alone — always
pair with `+`/`−` and `▲`/`▼`.

## Motion

### The frequency gate — apply before choosing any animation

| Frequency | Treatment |
|---|---|
| Rare (monthly) | Expressive motion welcome |
| Occasional (daily) | Subtle, fast |
| **Frequent (100s/day)** | **No animation. Stop here.** |
| **Keyboard-initiated** | **Never animate.** Not a judgment call. |

Side toggle, leverage slider, tab switch, order confirm and price tick are all in the
frequent band. **Most of this UI does not animate.**

One curve: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`. Never `ease-in` on UI.
Durations: press 100–160ms, tooltip 125–200ms, dropdown 150–250ms, modal 200–500ms.
Under 300ms. Exit faster than enter. Springs default to `bounce: 0`.

### Live values

- Hold live values in a **`MotionValue`**, never React state. Coalesce feed messages
  and flush **once per animation frame**.
- Write text by subscription: `useMotionValueEvent(mv, "change", …)`.
- **Never put a ticking number inside `layout`/`layoutId`** — forces a measure pass
  across the tree on every change.
- Health bars animate `transform: scaleX()`, never `width`.
- **WCAG 2.3.1 caps flashing at 3/second.** Rate-limit change-tint to ≤2/sec per
  cell, or drop it. This is a seizure-risk failure, not a style preference.
- `<MotionConfig reducedMotion="user">` — and note it only disables transform and
  layout, so gate `opacity`/`background` animations manually with `useReducedMotion()`.

## Market grid

**Uniform, not bento.** Every tile is the same size. The hero/unit split was built
and then removed: with a short list, size variation bought emphasis nobody asked for
and cost a consistent scan column.

- **Browse is a shortlist, not a catalogue.** 8 markets. Filters reach the rest.
- 1 column below 1280px, 2 columns above.

## Charts

Follow the `dataviz` skill; these are the project-specific bindings.

- **Single series, so no legend** — the card names it.
- **Colour follows direction** over the window: `--long` if the value rose,
  `--short` if it fell. Always paired with a `+`/`−` delta and a `▲`/`▼` glyph, so
  colour is never the only signal.
- **The series must end at the value printed beside it.** A chart that disagrees
  with its own number is worse than no chart. Mock series are walked *backwards*
  from the current price for exactly this reason.
- **Floor the vertical domain** (0.08 probability points). A sparkline auto-scaled
  to its own min/max turns a 0.4-point wobble into a dramatic swing — overstating
  movement in a product where people size positions off it.
- **Crosshair snaps to the nearest date.** Readers aim at a point in time, not at a
  2px line. The whole plot is the hit target.
- **Keyboard gets what hover gets** — arrows walk the series, Home/End jump to the
  ends, Escape clears.
- **The tooltip enhances, it never gates.** Endpoint dates and the delta are visible
  without hovering.
- **Value leads, label follows** in the tooltip: the reader has the series and wants
  the number.
- Deterministic mock data only — no `Math.random`, no `Date.now`. A chart that
  redrew differently on hydration is both a bug and a lie.

**Deliberate divergence from `dataviz`:** it advises proportional figures on large
standalone numbers, because `tabular-nums` makes display digits look loose. We keep
tabular on the probability figure anyway — it updates live, and preventing digit
jitter beats the typographic nicety. It also aligns down the grid column.

## Approved stack

| Need | Choice |
|---|---|
| Animation | **Motion**, imported from `motion/react` only |
| Base components | **shadcn/ui** |
| Tables | **TanStack Table** |
| Number transitions | **`@number-flow/react`** |
| Icons | **Lucide** (brand marks need a hand-maintained `icons/brands/`) |
| Charts | **Bklit UI** (MIT, visx) — only source with real candlestick primitives |
| Fonts | **`geist`** npm package |

**Turbopack warning:** Next 16 defaults to Turbopack, and mixing imports from the
`motion` barrel and `motion/react` produces two module instances in production —
layout animations silently no-op while dev works fine.

## Forbidden

### Neumorphism's own slop — the new entries

- **Nested extrusion.** Raised inside raised. Always wrong.
- **Extruding anything under 32px** — rows, badges, chips, status dots. The shadow
  becomes a smudge and the row count multiplies paint cost.
- **Animating `box-shadow`.** Any trigger, any duration. Paint-bound; 60 tiles doing
  it on scroll is a jank generator. **Hover changes the fill.**
- **Any shadow reaching a text box.** Wells with text get `padding-inline ≥ 14px`.
- **Coloured shadow lobes.** Two shadow colours exist. No green lobe under a long
  button. Side colour lives in the rim, label and glyph — never in the depth.
- **Symmetric or zero-offset depth.** `0 0 20px` halos. No light direction means no
  extrusion, just a bruise. Light is top-left, always.
- **Outer shadows on sticky/fixed elements** — nav, toolbars, sticky headers.
- **Depth for emphasis instead of affordance.** Emphasis is type size and weight.
- **Rimless soft-UI toggles, checkboxes, radios or switches.** The canonical
  neumorphic switch is the least usable control on the web.
- **Extruded skeletons.** A skeleton must not claim an affordance. Flat `--well`.

### Carried over unchanged

- **Any pulsing indicator** — `animate-pulse`, `@keyframes pulse|glow|breathe`. Every
  instance. There is no acceptable frequency.
- `transition: all`; `ease-in` on UI; `transform: scale(0)` entrances.
- Animating `width`/`height`/`margin`/`padding`/`top`/`left`.
- Motion's `x`/`y`/`scale` shorthand under load — **not hardware-accelerated**.
- Driving a child's transform from a CSS variable on the parent.
- `requestAnimationFrame` loops touching React state.
- Stagger on table rows. Any stagger in a data table.
- ≥4 components sharing an identical entrance; ≥3 sharing the same hover scale.
- Gradient text, aurora/shimmer/beam, scanlines, glitch, neon text-shadow.
- Decorative SVG backgrounds behind data.
- Emoji or Unicode glyphs standing in for an icon system.
- **Fake-precise numbers** — any figure must be real or explicitly labelled mock.
  The mock-data notice on the markets page is required while `isMockData` is true.
- Spinners where a skeleton belongs. Placeholder-as-label. Arbitrary `z-50` spam.
- Risk information behind a disclosure — liquidation price and health are visible at
  the moment of decision.

### Repealed from the flat system

- ~~"No cards"~~ — replaced by the elevation budget. The old markets-grid exception
  is absorbed and no longer needed.
- ~~`--radius: 0`~~ — replaced by the 8/12/16/20 scale. Rows/dividers stay 0.
- ~~"Hard offset shadows"~~ — **amended**: offset + *blur* is now the core mechanic.
  Zero-blur block shadows stay banned.
- ~~"Prefer explicit colors over translucent overlays"~~ — **narrowed**: still
  absolute for fills, text and rims. Shadow lobes are exempt, but may never fall
  under text.

## Related

- `animate`, `review-animations`, `improve-animations` — Emil Kowalski's numeric
  system; the authority when this file is silent on motion.
- `impeccable` — `/impeccable audit` and `/impeccable polish`.
- `design-motion-principles` — AI-slop audit thresholds.
