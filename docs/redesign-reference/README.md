# Redesign reference

Raw export from the design tool used to produce the "Classical"
redesign (2026-07-26) — committed here so future sessions can re-check
pixel fidelity against the original mockup instead of relying only on
its prose description in `docs/DESIGN_SYSTEM.md`.

- `Pulse Dashboard - Redesign.dc.html` — the target layout. Static HTML;
  open it directly or view source to see exact markup/classes.
- `Pulse Dashboard - Current.dc.html` — a recreation of the dashboard as
  it looked *before* this redesign (Liquid Glass), for comparison.
- `_ds/classical-*/` — the bundled "Classical" design system the mockup
  is built on: `styles.css` (the actual token/component CSS —
  authoritative over any prose description of colors/spacing/type),
  `readme.md` (the system's own usage guide), `theme.json`.
- `github.md` — the screen-to-repo-file map the design tool generated
  when it produced this mockup.
- `image-slot.js`, `support.js` — the mockup's own runtime scaffolding,
  not part of the design spec.

This is a static reference, not part of the app build — nothing here is
imported by `apps/web` or any package. `docs/DESIGN_SYSTEM.md` is the
canonical, kept-current description derived from it; when the two
disagree, re-derive `DESIGN_SYSTEM.md` from these files rather than
trusting stale prose.
