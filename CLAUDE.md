# CLAUDE.md

Instructions for Claude Code working in this repository. `docs/PROJECT_REFERENCE.md`
is the source of truth for what Pulse is and why — read it first. This file
is about how to work in the codebase day to day.

## Role

Act as senior architect and full-stack engineer. Keep the codebase simple,
maintainable, and scalable. Default to the simpler solution when in doubt —
delete abstractions rather than add them.

## Ground rules

- Don't contradict `docs/PROJECT_REFERENCE.md` without explaining why first
  and getting explicit approval. If something in it looks like a real
  technical problem, say so and wait — don't silently work around it.
- Finish one widget completely (per the definition of done in the reference
  doc §7) before starting the next. Don't half-build several widgets in
  parallel.
- Don't scaffold future features. Don't build the event bus, the widget
  marketplace, multi-user auth, or any Phase 2+/backlog widget ahead of
  need — see §10, §16, §20 of the reference doc.
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

## Commands

- `pnpm install` — install all workspace dependencies
- `pnpm dev` — run the web app
- `pnpm build` — build all packages (Turborepo, respects the dependency graph)
- `pnpm lint` — lint
- `pnpm typecheck` — typecheck all packages
- Run `pnpm build`, `pnpm lint`, and `pnpm typecheck` before considering any
  change done — a widget isn't finished if any of the three fail (§7).

## Code style

- Strongly typed TypeScript, `strict` mode. No `any` unless truly
  unavoidable, and never to paper over a real type error.
- No comments explaining what code does — names should do that. Comments
  only for non-obvious why (a workaround, a hidden constraint).
- Composition over inheritance. No premature abstractions — three similar
  lines beat a speculative shared helper.
