# Design System

Reference points: Arc Browser, Raycast, Linear, Vercel Dashboard, GitHub —
not Notion. Flat, minimalist, generous whitespace, no gradients or heavy
shadows.

This doc will grow as `packages/ui` gets its first shared components
(starting with the weather widget in Phase 1). For now it records the
constraints already set by the reference doc (§19) so early UI work doesn't
drift from them.

## Layout

- One reusable card component for every widget — consistent padding,
  radius, label style, icon placement — so mobile and desktop feel like the
  same app, not two designs.
- Responsive grid, not separate mobile/desktop builds:
  - Desktop (>1024px): 3-column grid
  - Tablet (600–1024px): 2-column grid
  - Mobile (<600px): single column, stacked
- On mobile, card order = priority order: schedule/tasks/emails first,
  GitHub/focus next, lighter widgets (YouTube/Spotify/habits/quote) last.
  Priority/order lives in config (`user_widgets.position`), not hardcoded
  per device — reordering is a data change, not a rebuild.
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

Nothing shared beyond raw Tailwind utility classes yet. The first
`packages/ui` component — the reusable widget card — gets built alongside
the first real widget (weather, per the build order in §9), not before.
