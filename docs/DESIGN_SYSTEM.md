# Design System

Reference points: Arc Browser, Raycast, Linear, Vercel Dashboard, GitHub —
not Notion. Flat, minimalist, generous whitespace, no gradients or heavy
shadows.

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

- Flat surfaces, no gradients, no heavy drop shadows.
- Generous whitespace over dense information.
- Dark mode is required for every widget (reference doc §7, definition of
  done) — styled via Tailwind's `dark:` variants, following the
  `apps/web/src/app/globals.css` theme tokens (`--background`,
  `--foreground`).

## Components

`packages/ui` — used by all 5 live widgets:

- **`WidgetCard`** — the one reusable card (`widget-card.tsx`): title, icon,
  action slot (top-right — usually the refresh button), content area. This
  is the single source of the "consistent padding/radius/label/icon"
  requirement above.
- **`ActionForm`** — generic `useActionState` wiring (`action-form.tsx`):
  pending state on submit, error message rendering. Every widget's refresh
  button and settings-save form both use this — no widget hand-rolls its
  own pending/error handling.

Nothing else shared yet (no icon set, no typography scale beyond Tailwind
defaults) — added only when a second widget would otherwise duplicate it.
