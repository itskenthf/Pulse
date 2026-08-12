# Pulse Design System

Version: 2.0 — "Classical" (supersedes the Liquid Glass system below;
see `docs/DECISIONS.md`'s 2026-07-26 entry for why).

---

# Philosophy

Pulse is a personal operating system.

It should feel calm, considered, and editorial — like a well-typeset page,
not a piece of software trying to look important.

The interface should disappear into the background while surfacing
information that matters.

Avoid designing Pulse like:

- Admin dashboards
- Analytics software
- Enterprise applications
- Glossy consumer apps chasing a "premium" look through gloss and blur

Instead, design it like a well-set page: hairlines, restrained color,
serif type doing the work that glow and gradient used to.

Design inspirations:

- Editorial print layouts and type systems
- Book design (matted photographs, tipped-in plates, colophon pages)
- The "Classical" bundled design system this redesign is built from

Pulse should establish its own identity rather than imitate any one product.

---

# Core Principles

## 1. Content First

The content is always more important than decoration.

Borders and rules should carry structure — they should never become the
focus themselves.

---

## 2. Calm Interface

Everything should feel quiet.

Avoid:

- loud colors
- heavy drop shadows
- gradients
- filled cards or buttons

The UI should feel effortless.

---

## 3. Spacious

Whitespace is intentional.

Every element should have room to breathe.

Never make layouts feel crowded.

---

## 4. Hierarchy

Users should instantly know:

1. where to look
2. what matters
3. what can wait

Hierarchy is created using:

- spacing
- typography (serif headings, weight, size)
- hairline rules
- the single accent color, used sparingly

NOT bright colors or per-widget brand colors.

---

## 5. Consistency

Every widget should feel like it belongs to the same operating system.

Never style widgets independently — all chrome (card, badge, menu, states)
comes from `packages/ui`.

---

# Color System

## Primary Background

A flat near-white paper tone (`--background`, `#f3f2f2` in light mode).

Never pure white, never a gradient.

## Surface

Bordered, unfilled. A hairline `--color-divider` border is what separates
a card from the page — not a translucent fill or blur.

## Text

Primary (`--foreground`): high contrast.

Secondary (`--color-neutral-600`): muted.

Tertiary (`--color-neutral-400`/`500`): low emphasis.

Disabled: 45% opacity.

## Accent

One accent color, `--color-accent` (a muted gold, `#b68235`), with a
100–900 tonal ramp (`--color-accent-100`…`--color-accent-900`). This is a
**mono-accent system** — unlike the old per-widget brand colors
(GitHub blue, Spotify green, Steam indigo), every widget's icon badge and
every "identity" surface uses the same accent now. Widget identity comes
from the icon and title, not a color.

Only use the accent for:

- icon badges
- borders/underlines on interactive elements
- focus rings
- progress indicators (e.g. Steam's achievement bar, `ProgressBar`,
  `ProgressRing`, `TrendLine`)

Never as a large fill. Never more than one accent.

### Progress indicators: three sanctioned shapes

- **`ProgressBar`** (`packages/ui/src/progress-bar.tsx`, promoted
  2026-08-09 from Steam's/Reading's previously hand-rolled local
  copies once Nutrition/Meals needed the same shape a third and fourth
  time): a thin `rounded-full` track with a solid
  `bg-[var(--color-accent)]` inner fill sized via `width: %`. The one
  place a large accent fill is sanctioned, for a small, low-visual-
  weight element. Used for Nutrition's per-metric daily-target bars and
  Meals' "N / 4 meals today" summary — see `docs/DECISIONS.md`'s
  2026-08-09 "progress bars" entry for why these were added (an
  explicit, acknowledged reversal of Body & Health's original
  "no gamified clutter" framing, done deliberately, not by accident).
- **`ProgressRing`** (`packages/ui/src/progress-ring.tsx`, added
  2026-08-09 for the Weight Tracker widget): a *stroked arc*, not a
  filled donut — two concentric `<circle>` elements, both `fill="none"`,
  the progress arc drawn via `stroke-dasharray`/`stroke-dashoffset`.
  Deliberately stricter than the filled-bar exception above: the ring is
  a larger, more prominent element (the Weight card, `/health/weight`),
  where a filled interior would read as much heavier than this system's
  flat, hairline aesthetic intends. Never fill the ring's interior.
- **`TrendLine`** (`packages/ui/src/trend-line.tsx`, added 2026-08-09): a
  single hairline `<polyline>` (`stroke-width: 1.5`, `fill="none"`) for a
  trend graph (e.g. Weight's history). No gradient area-under-curve — a
  filled area chart is a typical charting-library default and exactly
  the look the no-fills rule above prohibits. An optional dashed
  `--color-divider` reference line marks a goal value, not a second
  accent-colored data series.

---

# Surfaces (formerly "Glass Materials")

`packages/ui/src/glass.ts` still exports three levels — `light`/`medium`/
`heavy` — for source compatibility, but they're no longer glass: each is
the same flat paper-colored card with a 1px `--color-divider` border and a
shadow that only deepens step to step.

## Light

Used for: regular widget cards (`WidgetCard`), skeletons, error states.

## Medium

Used for: nothing currently rendered with elevated chrome above a regular
card — kept for a future surface that needs to sit slightly higher than a
widget card without the dropdown treatment of `heavy`.

## Heavy

Used for: dropdowns/overlays (`WidgetMenu`, `ProfileMenu`) — a marginally
stronger shadow so they read as "above" the page, still no blur.

---

# Radius Scale

Small (`--radius-sm`)

2px

Medium (`--radius-md`, `RADIUS.chip`)

4px

Large (`--radius-lg`, `RADIUS.card`/`RADIUS.hero`)

7px

Small, editorial radii — not the soft pill/blob curves of the old system.

---

# Shadow System

Soft, ink-tinted shadows derived from the page's dark neutral
(`color-mix(in srgb, #2d2b2b N%, transparent)`), stepped by surface level
(`--shadow-sm/md/lg`). No glow shadows, no colored shadows tied to a
widget's brand color.

---

# Spacing System

Density 1.15× baked into the scale (matches the bundled Classical tokens):
`--space-1` (4.6px) through `--space-8` (36.8px).

Use Tailwind's spacing utilities as before; the visual density comes from
the type/radius/border choices, not a new spacing scale layered on top.

---

# Typography

Two font families, loaded via `next/font/google`:

- `--font-heading`: Cormorant Garamond, weight 600 — widget titles, page
  heading, dialog/section titles.
- `--font-body`: Lora — everything else (default `body` font).

## Hero

Dashboard greeting. Largest text (`text-4xl sm:text-5xl`). Normal weight,
not bold — Classical's display sizes go lighter as they get bigger.

## Widget Title

`font-heading`, `text-sm font-semibold`.

## Body

Default content — Lora. Justified at wider widths where it reads well
(e.g. Hero's flowing sentence at `sm:` and up).

## Caption / Metadata

Muted (`--color-neutral-500`), smaller size.

Numbers (metrics, streak counts, the clock) stay `tabular-nums`
regardless of font.

---

# Motion

Kept from the previous system — Classical doesn't prescribe its own
motion language, and the existing spring-press/hover-color transitions
still read as calm and physical:

Hover

A static "you're over this" cue: the border darkens to the accent. No
lift, no scale — a moving/scaling whole card reads as distracting on a
flat, bordered surface.

Click

`SPRING_PRESS`: `motion-safe:hover:scale-105 motion-safe:active:scale-95`
on small interactive elements (buttons, icon tiles) only, not whole cards.

Duration

Fast (150ms) for hover/press — unchanged.

Never animate purely for decoration. Every animation should improve
usability, and everything motion-related respects `prefers-reduced-motion`.

---

# Layout

Desktop first. The dashboard should feel balanced.

Widgets may have different sizes — GitHub's wide card anchors a left
column, everything else stacks in a narrower right column (see
`apps/web/src/app/page.tsx`'s `WidgetGrid`).

---

# Widget Rules

Every regular widget (via `WidgetCard`) includes:

- title (serif, via `font-heading`)
- icon, in a shared outlined accent badge (not a per-widget glow color)
- primary content
- optional metadata
- optional actions (`WidgetMenu`)

Hero renders chromeless — a serif heading and flowing text above a
hairline rule, not a card.

Widgets should never feel overloaded. One widget = one purpose.

---

# Navigation

A plain hairline-bottomed bar: serif brand mark, sign-in/profile menu.
No floating pill, no blur.

Does not include placeholder links to unbuilt destinations (Tasks/Notes/
Settings) — those get added when the routes exist, not before (see
CLAUDE.md's scaffolding rule).

---

# Buttons

Primary

Outlined: accent-colored 1px border, transparent fill, accent-tinted
background on hover. Never solid-filled.

Secondary

Outlined in `--color-divider`, tinted foreground-color background on hover.

Icon

Circular, same outline treatment.

Ghost

Text-only in the accent color, tinted background on hover.

---

# Icons

Use Lucide throughout, plus each widget's own hand-drawn brand mark
(GitHub/Steam) rendered in `currentColor` so it always matches
whatever badge/text color it sits in — never a fixed brand color.

Consistent size, consistent stroke width.

---

# Accessibility

Always maintain:

- Readable text at AA contrast against the paper background
- `:focus-visible` as a 2px solid accent-colored outline — never the
  browser default
- Keyboard navigation (unchanged from the Hardening pass)
- Reduced-motion support (unchanged)

---

# Performance

No backdrop blur anywhere in the system — one less GPU-cost concern than
the previous system carried.

Reuse components. Minimize re-renders. Prefer reusable primitives over
repeated styling — unchanged from the Hardening pass's principles.

---

# Code Architecture

UI is built from reusable primitives in `packages/ui`:

- `glassClass` / `GLASS_HOVER` / `GLASS_CHIP` / `SPRING_PRESS` (`glass.ts`)
  — names kept from the old system for API stability; the underlying
  Tailwind strings are now hairline/no-blur.
- `RADIUS` (`tokens.ts`)
- `WidgetCard`, `WidgetMenu`, `ActionForm`, `Metric`, `Skeleton`,
  `EmptyState`, `ErrorState`, `useDismissableMenu`
- `Button` (outlined accent button), `IconButton` (danger/delete round
  button), `UndoableDeleteRow` (pairs with `useUndoableDelete`),
  `ViewAllLink`, `SectionLabel`, `FIELD_CLASS` (added 2026-08-12 —
  consolidating patterns previously hand-rolled per widget; see
  docs/DECISIONS.md)

Design tokens (CSS variables in `apps/web/src/app/globals.css`) should
power the interface instead of hardcoded hex/rgba values wherever a
token exists for the role in question.

---

# Future Direction

Pulse should feel less like a website and more like a well-set page.

Every future feature should ask:

"Does this make Pulse feel calmer and more considered, or does it add
noise the typography and hairlines should have carried instead?"

If not, redesign it before implementation.
