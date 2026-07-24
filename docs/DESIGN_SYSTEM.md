# Design System

Reference points: Arc Browser, Raycast, Linear, Vercel Dashboard, GitHub —
not Notion. Flat, minimalist, generous whitespace. As of the 2026-07
redesign (docs/DECISIONS.md), bolder than pure-flat: a two-tone card system
with a soft shadow and larger radius, adapted from a user-provided design
reference — see "Two-tone cards" below.

This doc records the constraints set by the reference doc (§19) so widget
UI work doesn't drift from them, and tracks what's actually built in
`packages/ui` as it grows.

## Layout

- One reusable card component for every widget — consistent padding,
  radius, label style, icon placement — so mobile and desktop feel like the
  same app, not two designs.
- Responsive grid, not separate mobile/desktop builds:
  - Desktop (>1024px): 3-column grid
  - Tablet (600–1024px): 2-column grid
  - Mobile (<600px): single column, stacked
- On mobile, card order = priority order (§19's intent — heavier/more
  actionable widgets first, lighter ones like Steam/quote last). **Not yet
  implemented**: cards currently render in registration order
  (`apps/web/src/lib/register-widgets.ts`), not from `user_widgets.position`
  — the `user_widgets` table exists in the schema but nothing reads/writes
  it yet. Revisit once there's an actual widget-management screen (not
  scheduled — Phase 1's remaining scope is Quote/Quick launch/Spotify, see
  `docs/ROADMAP.md`).
- Don't add detail to mobile cards just because there's more screen space —
  keep cards consistent across breakpoints; extra detail belongs behind a
  tap-through, not crammed into the card.

## Visual language

- No gradients, no background texture, no sidebar nav — single-page
  dashboard, not a multi-view app.
- Generous whitespace over dense information.
- Dark mode is required for every widget (reference doc §7, definition of
  done) — styled via Tailwind's `dark:` variants, following the
  `apps/web/src/app/globals.css` theme tokens (`--background`,
  `--foreground`).
- Body font is Geist Sans (`--font-sans`, loaded in `apps/web/src/app/layout.tsx`).

## Two-tone cards

`WidgetCard` takes a `tone?: "default" | "accent"` prop (default omitted).
`"accent"` inverts the card to the opposite end of the zinc scale from
whichever color scheme is active — `bg-zinc-950`/`text-zinc-50` in light
mode, flipped in dark mode — so the inverted card stays the "dark" one in
both themes rather than flattening to the page background in dark mode.
This is a per-widget rendering choice made in each widget's own
`component.tsx`, not part of the `Widget` interface in `packages/sdk` —
keeps the decision widget-owned instead of adding SDK surface for a purely
visual concern.

Currently `tone="accent"` on Greeting, Clock, and Quote (3 of 9 widgets) —
chosen to echo the reference's mostly-light-with-a-few-dark-cards balance,
not evenly split. Any widget's own content text should use `text-current`
(not hardcoded `text-zinc-950`/`text-zinc-50`) so it reads correctly
regardless of which tone the card renders with.

`ActionForm`'s button uses `border-current`/`text-current`/
`hover:bg-current/10` for the same reason — it inherits legible coloring
from whatever tone the surrounding `WidgetCard` sets, without needing its
own tone prop. Error text stays hardcoded red for clear signaling
regardless of tone.

## Components

`packages/ui` — used by all 9 live widgets:

- **`WidgetCard`** — the one reusable card (`widget-card.tsx`): title, icon,
  action slot (top-right — usually the refresh button), content area,
  `tone` prop (see above). `rounded-2xl`, soft shadow. This is the single
  source of the "consistent padding/radius/label/icon" requirement above.
- **`ActionForm`** — generic `useActionState` wiring (`action-form.tsx`):
  pending state on submit, error message rendering. Every widget's refresh
  button and settings-save form both use this — no widget hand-rolls its
  own pending/error handling.

Nothing else shared yet (no icon set, no typography scale beyond Tailwind
defaults) — added only when a second widget would otherwise duplicate it.
