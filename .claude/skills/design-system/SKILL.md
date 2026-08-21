---
name: design-system
description: Use when building, styling, or reviewing ANY UI in this project — screens, components, colors, typography, spacing, motion, numeric displays, tables, charts, or icons. Points at DESIGN.md, the committed design record, and carries the rules most often broken.
---

# Design System

**[DESIGN.md](../../../DESIGN.md) at the repo root is the source of truth.** Read it
before styling anything. This file is a short agent-facing summary and defers to
it wherever they differ — do not restate token values here, or they will drift.

## What the system is

Warm-neutral (stone), **flat**, **dual-theme**. No shadows anywhere: depth is
expressed by fill and border. TikTok Sans for headlines, Geist for body, Geist
Mono for every number.

Light and dark are both first-class. Dark is *composed*, never derived by
inverting light — each step is chosen against its own ground and verified.

## The rules broken most often

**Two border tokens, and they are not interchangeable.**
`--hairline` is decorative (dividers, row rules). `--border` is for anything
interactive and must clear **3:1** — in a flat design the border *is* the
control's edge, with no shadow doing the work. The palette's original single
border value measured 1.48:1 on white, which is why they split.

**Check contrast in both themes.** A value that passes on `#FAFAFA` can fail on
`#221E1B`. Body text ≥4.5:1, controls/icons/focus ≥3:1.

**Colour is never the only signal.** Always paired with `+`/`−` and `▲`/`▼`.

**The frequency gate.** Anything a user triggers 100+ times/day — side toggle,
leverage slider, tab switch, order confirm, price tick — gets **no animation**.
Keyboard-initiated actions are a disqualifier, not a judgment call.

**Tabular numerals on every updating value**, with fixed decimals and reserved
sign width so columns never jitter.

**Risk information is never behind a disclosure.** Liquidation price, max loss
and health stay visible at the moment of decision. *Modelling caveats* may be
collapsed; the numbers may not.

**Canvas can't read CSS custom properties.** Charts read the plain-hex
`--chart-*` mirrors and rebuild on theme change. Reading the themed tokens
directly returns `lab(...)` after Lightning CSS processes them, which
third-party colour parsers reject.

## Classes

`.panel` — container, `--surface` fill + `--hairline` border, not interactive.
`.control` — pressable, `--surface` fill + `--border`, hover swaps to `--raised`.
`.well-field` — input, `--bg` fill + `--border`.

A card holding interactive children is a `.panel`, never a `.control`.

## Related skills

`animate`, `review-animations` — Emil Kowalski's numeric system; the authority
when DESIGN.md is silent on motion. `impeccable` — `/impeccable audit`.
