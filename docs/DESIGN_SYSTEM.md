# Design System

Reference points: Arc Browser, Raycast, Linear, Vercel Dashboard, GitHub —
not Notion. Flat, minimalist, generous whitespace. As of the 2026-07-24
redesign (docs/DECISIONS.md), a light-blue theme adapted from a
user-provided design reference: a soft blue gradient page background, white
cards, and small colored icon badges — see "Visual language" below. An
earlier same-day attempt used a two-tone black/white card system; that was
replaced after the user reviewed it live and asked for all-white cards
instead — see docs/DECISIONS.md for both entries.

This doc records the constraints set by the reference doc (§19) so widget
UI work doesn't drift from them, and tracks what's actually built in
`packages/ui` as it grows.

## Layout

- One reusable card component for every regular widget — consistent
  padding, radius, label style, icon placement — so mobile and desktop feel
  like the same app, not two designs.
- One widget (`hero`, `packages/widgets/hero`) renders full-width above the
  card grid, chromeless — see "Hero banner" below.
- **Masonry-style column layout** (2026-07-24, Ken's request — replaced a
  uniform-row CSS grid, which left visible gaps under shorter cards): the
  card area (`apps/web/src/app/page.tsx`'s `WidgetGrid`) uses CSS
  multi-column (`columns-1 sm:columns-2 lg:columns-3`) with each card
  wrapped in `mb-4 break-inside-avoid`, instead of `grid-cols-*`. Cards pack
  tightly top-to-bottom per column — no JS masonry library needed.
  - Desktop (>1024px): 3 columns
  - Tablet (600–1024px): 2 columns
  - Mobile (<600px): 1 column, stacked
- On mobile, card order = priority order (§19's intent — heavier/more
  actionable widgets first, lighter ones like Steam last). **Not yet
  implemented**: cards currently render in registration order
  (`apps/web/src/lib/register-widgets.ts`), not from `user_widgets.position`
  — the `user_widgets` table exists in the schema but nothing reads/writes
  it yet. Revisit once there's an actual widget-management screen (not
  scheduled).
- Don't add detail to mobile cards just because there's more screen space —
  keep cards consistent across breakpoints; extra detail belongs behind a
  tap-through, not crammed into the card.
- **Compact sidebar** (2026-07-24, Ken's request — reverses the earlier
  "no sidebar nav" decision, see docs/DECISIONS.md): a 64px icon rail
  (`apps/web/src/app/page.tsx`'s `Sidebar`), sticky full-height, left of the
  main content. Only "Dashboard" is active (highlighted, sky accent); Tasks
  and Habits are visible but disabled placeholders (`title="… — coming
  soon"`, no `href`) — future-section signposting, not functional routes or
  scaffolded backend.
- **Profile menu**: the header's account control is a `<details>`/`<summary>`
  dropdown pill (avatar or initial-letter badge + name), not a bare
  "Signed in as X / Sign out" text row. Opens to "Settings" (a disabled
  placeholder — there's no global settings page yet) and "Sign out" (real,
  same server action as before). Deliberately built as `<details>` rather
  than a client component with `useState`, so the whole header stays a
  server component — no extra client JS for what's fundamentally a CSS/HTML
  disclosure widget.

## Visual language

- Page background is a soft blue gradient (`apps/web/src/app/page.tsx`:
  `from-sky-50 via-blue-50 to-white` in light mode, a dark blue/slate
  gradient in dark mode) — adapted from the user's design reference.
- Cards are white (`bg-white/90` light, `bg-zinc-900/90` dark), `rounded-2xl`,
  soft shadow, semi-transparent with `backdrop-blur-sm` so the gradient
  reads through at the edges.
- Each card's icon sits in a small filled circle badge (`bg-sky-100
  text-sky-600` light, dark equivalents) — echoes the reference's colored
  icon-badge treatment, kept to a single accent color (sky blue) for
  minimalism rather than the reference's varied palette.
- No background texture, no heavy drop shadows beyond the cards' own soft
  shadow.
- Generous whitespace over dense information.
- **Light-blue is the only actively designed theme** (2026-07-24, Ken's
  request) — dark mode's `dark:` variants stay in the code as a cheap
  fallback for OS/device dark mode, but aren't the design target and don't
  get the same visual polish pass. Still satisfies reference doc §7's
  literal "doesn't break in dark mode" bar, just not its original "equally
  designed" intent — see docs/DECISIONS.md.
- Body font is Geist Sans (`--font-sans`, loaded in `apps/web/src/app/layout.tsx`).
- Refresh buttons are icon-only (circular-arrow SVG, `ActionForm`'s
  `variant="icon"`) — `aria-label`/`title` carry the "Refresh" text for
  accessibility. Settings-save buttons keep the default text variant.

## Hero banner

`packages/widgets/hero` is a single widget with `size: "hero"` in the SDK's
`WidgetSize` union — the shell (`apps/web/src/app/page.tsx`) renders any
`"hero"`-sized widget full-width, above the card grid, without wrapping it
in `WidgetCard`. It's a generic mechanism (driven by `size`, not a
hardcoded widget id in the shell), but in practice only one widget uses it.

Hero combines what were five separate cards (Greeting, Weather, Quote,
Clock, Calendar) into one flowing banner: a large greeting headline, a
date + live-ticking time line, "Today" with a one-line weather summary, a
static tagline, and "Quote" with a random quote — see the widget's own
`component.tsx`. It aggregates its own data in `fetch.ts` (reusing
`@pulse/adapter-weather` directly and an inlined copy of the greeting/quote
logic) rather than reading other widgets' cache, so the shell still never
needs to know what's inside any widget's data. The live clock is a small
`"use client"` sub-component (`hero-clock.tsx`) that ticks every second,
same pattern the old standalone Clock widget used. The old
`packages/widgets/greeting`, `weather`, `quote`, `clock`, and
`calendar-date` packages were all deleted — their UI is fully superseded
by Hero. `packages/adapters/weather` is unchanged and still used, just by
Hero instead of a `weather` widget.

**No settings UI** (2026-07-24, Ken's request): Hero has no settings form
at all. Name comes from the GitHub login profile automatically
(`readUserName` in `packages/database`, reading `next_auth.users.name` —
the same OAuth profile the user already signed in with, no extra setting
needed). Time zone and weather location are fixed constants in
`packages/widgets/hero/src/constants.ts` (`Asia/Kuching` / Kuching's
coordinates) rather than a per-user setting — reasonable for a single-user
app; revisit if Pulse ever supports more than one user. See
docs/DECISIONS.md for the auto-location tradeoffs considered.

## Card accents

(2026-07-24, Ken's request — "every widget is white," no visual identity.)
`WidgetCard` takes an `accent?: "blue" | "green" | "indigo" | "none"` prop
(`packages/ui/src/widget-card.tsx`) — a thin colored left border
(`border-l-4`), not a full recolor of the card. Kept as a small, fixed set
of Tailwind color tokens rather than an arbitrary-hex prop, so every
widget's accent still comes from the same restrained palette instead of
drifting into a rainbow of one-off colors. Currently assigned: GitHub
`"blue"`, Spotify `"green"` (a nod to Spotify's own brand green), Steam
`"indigo"` (a darker blue, distinct from GitHub's). Quick Launch stays
`"none"` (unspecified) rather than guessing a color for it. Hero isn't a
`WidgetCard` at all (chromeless), so instead its own weather section gets
a sky-gradient background chip and its date/time line gets a small violet
accent dot — same "give each concern a color" idea, applied inside Hero's
own markup since it doesn't use the shared card.

## Graphs

Widgets with real magnitude data get a lightweight bar visualization instead
of a plain number/text list — plain CSS/SVG, no charting library, per the
`dataviz` skill's method (form → color → marks, in that order):

- **Steam** (`packages/widgets/steam/src/playtime-bar.tsx`): each recently
  played game gets a horizontal bar sized relative to the longest-played
  game in the list (magnitude comparison → bar, single sequential hue —
  identity/categorical color isn't the job here, so no per-game color
  coding). Track is a lighter step of the same blue ramp (`bg-sky-100`),
  fill is the solid accent (`bg-sky-500`) — the "meter" pattern. Value
  labeled directly at the bar's end rather than requiring a hover/legend.
- **GitHub** (`packages/widgets/github/src/heatmap.tsx`): the existing
  contribution heatmap recolored from green to the same sequential blue
  ramp used everywhere else, for theme consistency — no structural change,
  it was already the right form for this data (a magnitude grid).
- **Spotify** deliberately has **no graph** — its public API doesn't expose
  play counts or listening-time totals, so there's no real magnitude data
  to visualize; forcing a fake number would be worse than the current
  ranked list. See docs/DECISIONS.md.

## Components

`packages/ui` — used by all 5 live widgets (4 cards + Hero):

- **`WidgetCard`** — the one reusable card (`widget-card.tsx`): title, icon
  (rendered in a colored badge circle), action slot (top-right — usually
  the refresh button), content area. `rounded-2xl`, soft shadow, translucent
  white background. This is the single source of the "consistent
  padding/radius/label/icon" requirement above. Not used by Hero, which
  renders chromeless.
- **`ActionForm`** — generic `useActionState` wiring (`action-form.tsx`):
  pending state on submit, error message rendering. Every widget's refresh
  button and settings-save form both use this — no widget hand-rolls its
  own pending/error handling.

Nothing else shared yet (no icon set, no typography scale beyond Tailwind
defaults) — added only when a second widget would otherwise duplicate it.
