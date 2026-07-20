# Roadmap

Full phase definitions and gates live in `docs/PROJECT_REFERENCE.md` §12
and §18 — this doc tracks live status against them.

## Phase 0 — setup

- [x] GitHub repo, monorepo tool decided (Turborepo — see `docs/DECISIONS.md`)
- [x] Next.js app scaffolded in `apps/web`
- [x] Widget SDK contract defined (`packages/sdk`)
- [x] Auth.js wired with GitHub as first provider
- [x] Core DB schema migrations written (`supabase/migrations/`)
- [x] Supabase project created
- [x] GitHub OAuth App registered
- [x] Deployed to Vercel (`https://pulse-plum-seven.vercel.app`)
- [x] **Gate:** log in with GitHub, see your own name echoed back — confirmed

**Phase 0 is complete.** Next up: Phase 1, starting with the weather
widget (no auth — proves the SDK/render pattern) per the widget
development order in the reference doc §9.

## Phase 1 — MVP (read-only dashboard)

Not started. Per the reference doc's widget development order (§9):

1. Weather (no auth)
2. Greeting
3. Clock
4. Calendar (first OAuth widget — Google)
5. GitHub (second OAuth provider)
6. Tasks
7. Email (Gmail readonly)
8. Focus timer (first write-back)
9. Habits
10. Spotify (third OAuth provider)
11. YouTube
12. Quick launch

**Gate to move on:** the Phase 1 success gates in the reference doc §18 —
daily use for two consecutive weeks, trusted data, at least one widget
replacing a separately-checked tool.

## Phase 2 — make it actionable

Not started. Blocked on Phase 1 gate.

## Phase 3 — personal analytics

Not started. Blocked on Phase 2 gate.

## Phase 4 — publish (optional)

Not started, not committed to. A decision to revisit after Phase 3, not a
default next step.
