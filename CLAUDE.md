# CLAUDE.md

Instructions for Claude Code working in this repository. `docs/PROJECT_REFERENCE.md`
is the source of truth for what Pulse is and why — read it first. This file
is about how to work in the codebase day to day.

## Project vision

Pulse is a **Personal Operating System** — a calm, considered surface that
brings the tools and information Ken checks every morning into one screen.

Pulse is **not**:

- an admin dashboard
- an analytics dashboard
- a widget gallery

Every engineering and design decision should support the "personal OS"
framing, not the generic-dashboard one. When in doubt, ask whether a
choice makes Pulse feel more like considered software someone lives in,
or more like a panel of stats — the former wins.

## Role

Act as senior architect and full-stack engineer. Keep the codebase simple,
maintainable, and scalable. Default to the simpler solution when in doubt —
delete abstractions rather than add them.

## Design source of truth

`docs/redesign-reference/` holds the raw exported mockup the current
("Classical") redesign is built from — the actual HTML/CSS, not just a
prose description. `docs/DESIGN_SYSTEM.md` is the canonical, kept-current
description derived from it.

Whenever a redesign reference exists (currently: `docs/redesign-reference/`):

- Reproduce it as accurately as possible.
- Do not reinterpret layouts, simplify spacing, remove sections, redesign
  widgets, or invent alternative layouts not shown in the reference.
- If the live implementation differs from the reference, that's a bug to
  close, not a style choice to defend.
- If a technical constraint makes exact reproduction impossible (e.g. the
  reference's static mock data vs. real fetched data, or a piece of chrome
  the reference doesn't specify), explain the limitation **before**
  changing anything, and default to the reference wherever the constraint
  allows a choice.
- Never silently deviate from the reference. If unsure whether a gap
  matters, ask first — don't guess.

## Design philosophy ("Classical")

The interface should be calm, editorial, and considered — closer to a
well-set page than to software trying to look important. In full, in
`docs/DESIGN_SYSTEM.md`; in short:

- Serif type (Cormorant Garamond headings, Lora body) over sans-serif UI
  chrome.
- A flat, near-white paper background — never a gradient, never pure white.
- Structure comes from hairline borders and whitespace, not fills, blur,
  or drop shadows.
- One accent color (a muted gold), used only as strokes/borders/focus
  rings — never as a fill, and never a second accent per widget.
- Outlined buttons and icon badges, never solid-filled.
- Content first: decoration never outranks the information a widget exists
  to show.

This supersedes the earlier "Liquid Glass" system (frosted blur, gradient
background, per-widget glow colors) — see `docs/DECISIONS.md`'s
2026-07-26 entry for the full reasoning behind that switch.

## Layout standards

- Responsive CSS Grid / flex layout: a hero banner (chromeless, full
  width) above a two-column split — a wide column for `"lg"`-sized
  widgets, a narrower rail for everything else — collapsing to a single
  column on mobile. See `docs/PROJECT_REFERENCE.md` §19 and
  `apps/web/src/app/page.tsx`'s `WidgetGrid`.
- Consistent gutters/padding and a shared max content width across the
  shell (`apps/web/src/app/page.tsx`'s `<main>`), not per-widget one-offs.
- Widget edges align to the same grid; widgets size to their own content
  height (the grid does not stretch shorter cards to match a taller
  neighbor — see the Hardening pass's Stage 5 fix in `docs/DECISIONS.md`
  for why a shared-row CSS Grid doesn't work here).
- Widgets occupy space intentionally — real content, not invented filler,
  but also not sparse layouts with large unused areas.
- No navigation chrome beyond the navbar itself (no sidebar, dock, or
  bottom nav — deleted outright per Ken's request, see
  `docs/PROJECT_REFERENCE.md` §19). Don't reintroduce these without an
  explicit new request.
- Avoid layouts that force unnecessary scrolling — a widget's content
  should fit its card at every supported breakpoint.

## Widget standards

Every regular widget renders through the shared `WidgetCard`
(`packages/ui/src/widget-card.tsx`) and follows the same structure:

- **Header**: icon (in the shared outlined accent badge), title, a status
  indicator when the widget has one worth surfacing (e.g. "Connected",
  a count), and the "⋯" actions menu (`WidgetMenu`).
- **Body**: the widget's actual content.
- **Loading / Empty / Error**: every widget must have all three,
  via the shared `Skeleton`, `EmptyState`, and `ErrorState` primitives —
  see the definition of done below.
- **Footer**: optional, used only when a widget genuinely needs one.

Hero is the one exception — `size: "hero"` renders full-width and
chromeless (no card), per the reference mockup.

Widgets should never invent their own layout or chrome. If a widget
needs something `WidgetCard`/`WidgetMenu` doesn't support yet, extend the
shared primitive — don't build a one-off in the widget package.

## Visual consistency

Every widget must share, via `packages/ui` (never re-implemented locally):

- Spacing (Tailwind's scale, applied consistently)
- Corner radius (`RADIUS` in `packages/ui/src/tokens.ts`)
- Header height / icon sizing
- Typography hierarchy (`font-heading` for titles, body font otherwise)
- Hover/focus/press behavior (`glass.ts`'s `GLASS_HOVER`/`SPRING_PRESS`,
  `:focus-visible` in the accent color)
- Elevation (`glassClass()`'s light/medium/heavy levels)
- Card padding

Consistency has higher priority than per-widget creativity. A widget that
wants to look different from its siblings needs a real reason, recorded
in `docs/DECISIONS.md` — not a local style choice.

## Responsive requirements

Every implementation must work across desktop, laptop, tablet, and
mobile. Before considering a change done, verify:

- No horizontal overflow at any supported width
- No clipped or cut-off widget content
- No controls that become inaccessible or untappable at small widths
  (44×44px minimum touch targets — see `docs/DECISIONS.md`'s
  accessibility-pass entry)
- Layouts stay visually balanced, not just "technically fits"
- Typography stays readable at every size
- Verify with real measurements at real widths (Playwright at multiple
  viewports), not by eyeballing one size — see the Hardening pass's
  Stage 5 entry in `docs/DECISIONS.md` for why assumption-based
  responsive checks previously missed a real bug.

## Design fidelity (mandatory)

When implementing UI against an existing reference (a mockup, or an
already-approved design in `docs/DESIGN_SYSTEM.md`):

- Never redesign it.
- Never simplify it.
- Never remove a section it shows.
- Never substitute a different component for what it specifies.
- Never replace its layout with personal preference.
- Never assume a feature the reference shows should be dropped because it
  seems unnecessary — if it's in the reference, build it, or ask first if
  something makes that genuinely impossible.

Pixel fidelity to the approved reference is expected, not "close enough."
If unsure whether something matches — ask first, don't guess.

## Error handling

- Widgets fail gracefully: one widget's error must never break the rest
  of the dashboard (`WidgetErrorBoundary`, one per widget — see
  `docs/DECISIONS.md`'s Hardening-pass Stage 1 entry).
- Error states preserve the surrounding layout — a failed widget still
  occupies its normal card shape, not a layout-shifting placeholder.
- Prefer a quiet, small `ErrorState` over a large warning that dominates
  the page.

## Ground rules

- Don't contradict `docs/PROJECT_REFERENCE.md` without explaining why first
  and getting explicit approval. If something in it looks like a real
  technical problem, say so and wait — don't silently work around it.
- Claude should never independently change UX/visual decisions. If a
  request conflicts with the design reference, the project vision, or
  the architecture, stop and explain the trade-offs before proceeding —
  don't just pick one and go.
- Finish one widget completely (per the definition of done below) before
  starting the next. Don't half-build several widgets in parallel.
- Don't scaffold future features. Don't build the event bus, the widget
  marketplace, multi-user auth, or any Phase 2+/backlog widget ahead of
  need — see §10, §16, §20 of the reference doc. This includes UI: don't
  add nav links or placeholder cards for widgets/routes that don't exist
  yet, even if a design reference shows them, without confirming first.
- Widgets never call external APIs directly and never fetch their own data
  at render time — that's the adapter layer's and the scheduler's job,
  respectively. See `docs/ARCHITECTURE.md`.
- The dashboard shell (`apps/web`) never contains widget-specific business
  logic — it only depends on the `Widget` interface in `packages/sdk`.
- Any new env var a widget/adapter reads must be added to `turbo.json`'s
  `build.env` array (strict env mode) and `.env.example` — see
  `docs/DECISIONS.md`'s entry on this, it's a real trap.
- Record real architectural decisions in `docs/DECISIONS.md` as they're
  made, with the reasoning — not just the conclusion.
- Keep `docs/ROADMAP.md` current when a phase item is completed.
- Keep `docs/DESIGN_SYSTEM.md` in sync with `docs/redesign-reference/` —
  if they disagree, the reference wins; update the prose doc, don't trust
  it blindly.

## Development workflow

Before implementing any request:

1. Understand the task.
2. Read the existing implementation.
3. Compare against `docs/PROJECT_REFERENCE.md` / `docs/ARCHITECTURE.md`.
4. Compare against `docs/DESIGN_SYSTEM.md` and `docs/redesign-reference/`
   for anything UI-facing.
5. Implement.
6. Verify responsiveness (real widths, not assumption).
7. Verify visual consistency against the shared primitives.
8. Run `pnpm lint`.
9. Run `pnpm typecheck`.
10. Run `pnpm test` (unit/component suite) and, for anything touching
    `apps/web`'s pages/components, `pnpm --filter @pulse/web test:e2e`.
11. Run `pnpm build`.
12. Summarize what changed.

## Commands

- `pnpm install` — install all workspace dependencies
- `pnpm dev` — run the web app
- `pnpm build` — build all packages (Turborepo, respects the dependency graph)
- `pnpm lint` — lint
- `pnpm typecheck` — typecheck all packages
- `pnpm test` — unit/component tests (Vitest) across every package that has them
- `pnpm --filter @pulse/web test:e2e` — Playwright end-to-end tests against
  a real running dev server (signed-out pages only — see
  `apps/web/playwright.config.ts`'s comment for why)

## Definition of done

A widget or UI change is complete only when:

- `pnpm build` passes
- `pnpm lint` passes
- `pnpm typecheck` passes
- `pnpm test` passes (add/update unit tests for any new pure logic or
  Zod schema; add/update a component test for any new shared `packages/ui`
  primitive with real interaction behavior)
- It's responsive at every supported breakpoint
- It matches the design reference (no unexplained visual regressions)
- No console errors, no hydration mismatches
- Registered with the widget registry, fetches real data, reads/writes
  cache, and has loading/error/empty states, manual refresh, and settings
  (unless explicitly exempted — see `docs/PROJECT_REFERENCE.md` §7)
- `docs/DECISIONS.md` / `docs/ROADMAP.md` updated if the change is a real
  architectural or scope decision, not just an implementation detail

## Code style

- Strongly typed TypeScript, `strict` mode. No `any` unless truly
  unavoidable, and never to paper over a real type error.
- No comments explaining what code does — names should do that. Comments
  only for non-obvious why (a workaround, a hidden constraint).
- Composition over inheritance. No premature abstractions — three similar
  lines beat a speculative shared helper.
