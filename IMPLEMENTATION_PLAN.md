# Pulse — Master Implementation Plan

Source: `PERFORMANCE_AUDIT.md`, `UX_AUDIT.md`, `ARCHITECTURE_AUDIT.md`,
`FEATURE_GAP_REPORT.md` (all 2026-08-08). This plan de-duplicates findings
that appear in more than one report, orders the result by **(1) biggest
user impact, (2) lowest engineering effort)**, and groups it into phases
sized so each can land as a small, independently-verifiable commit (or
small commit set) with `pnpm lint`/`pnpm typecheck`/`pnpm build` green
after every phase.

Not every finding across all four audits is in scope for this pass — see
"Deferred" at the bottom for what's intentionally held back, and why.

## Cross-report duplicate map

| Theme | Reports |
|---|---|
| No `loading.tsx` / navigation blocks on data | PERF C2, UX L1 |
| `session: { strategy: "database" }` | PERF C1 |
| `revalidatePath("/")` reloads everything | PERF C3, PERF M3, FEATURE #1 |
| `<a>` instead of `<Link>` on 4 files | UX N1, FEATURE #5 |
| Delete has no undo | UX M2, FEATURE #3 |
| `createServiceClient()` not memoized | PERF H2, ARCH DB1 |
| No batched widget cache/settings reads | PERF H1, ARCH DB2 |
| Habits/Reading placeholder cards | UX S1, FEATURE #9 |
| Write-action boilerplate duplication | ARCH CD1 |
| No global `:focus-visible` | UX A1 |
| Heatmap cell `aria-label` | UX A2 |
| Dead "Settings" nav row | UX N3 |
| Unused Geist/Geist Mono fonts | PERF H3 |

## Phased plan

### Phase 1 — Zero-risk fixes (accessibility, dead code/UI, cheap high-value)
Highest impact-to-effort ratio in the whole backlog: every item is either a
deletion or a small additive change, none touch data flow or auth.

1. Remove unused Geist/Geist Mono fonts (PERF H3)
2. Add a global `:focus-visible` outline rule (UX A1)
3. Add `aria-label` to GitHub heatmap day cells (UX A2)
4. Remove the dead, unclickable "Settings" row from the profile menu (UX N3)
5. Swap `<a href>` → `<Link>` on the 4 dashboard-card links (UX N1 / FEATURE #5)
6. Add a color transition to completed-task text (UX M1)
7. Memoize `createServiceClient()` with React's `cache()` (PERF H2 / ARCH DB1)

### Phase 2 — Loading states + auth session strategy (Critical, additive + one config change)
8. Add `loading.tsx` per route, reusing the existing `Skeleton` (PERF C2 / UX L1)
9. Switch Auth.js session strategy from `database` to `jwt` (PERF C1)

### Phase 3 — Narrow cache invalidation (Critical perf, moderate effort)
10. Wrap widget cache/settings reads in `unstable_cache` tagged per
    `(userId, widgetId)`; have write actions `revalidateTag` just the
    affected widget instead of relying on a full-page reload doing 14
    round trips for a 1-widget change (PERF C3 / M3, contributes to ARCH DB2)

### Phase 4 — High-impact daily-use fixes
11. Undo-able delete for Tasks and Notes (UX M2 / FEATURE #3)
12. Resolve the Habits/Reading "Coming soon" placeholders — remove them
    from the live grid per the audits' first recommended option, since
    building Habits for real is out of scope here (UX S1 / FEATURE #9)
    — **flagged explicitly, this is a visible product decision, not a
    pure bug fix; done because both audits recommend it and CLAUDE.md's
    own "don't scaffold ahead of need" rule already applies to this
    exact situation for nav links.**

### Phase 5 — Code-quality cleanup
13. Extract the shared `write-action` helper (auth check → try/write/
    refresh → catch/format-error → revalidate) used identically by
    `notes.ts`/`tasks.ts`/`notebook.ts` (ARCH CD1)

### Deferred (documented, not implemented this pass)

These are real findings but are either large/risky refactors that deserve
their own reviewed change, exploratory/product decisions requiring
explicit sign-off, or net-new features rather than fixes:

- **ARCH WS1/WS2** — `WidgetGrid`'s hardcoded widget lookups / no
  auto-flow fallback. This is a real architectural rewrite of the
  dashboard's layout logic — CLAUDE.md is explicit that layout is
  design-reference-governed and Claude must not change layout/visual
  decisions unilaterally. Flagging for a dedicated, explicitly-approved
  pass, not bundling into this one.
- ~~**FEATURE #4 — RSS settings UI.**~~ **Done 2026-08-08** — see
  `docs/DECISIONS.md`'s matching entry. `packages/widgets/rss` now has
  a real settings form (`settings.ts`/`settings-form-fields.tsx`,
  following Steam's existing pattern) instead of the fully hardcoded
  `RSS_SOURCES` list.
- **UX K1/FEATURE #6 — keyboard shortcuts.** New interaction surface
  (a shortcut-handling layer), not a fix — worth a dedicated pass with
  its own discoverability design (e.g. a `?` help overlay), not bolted on.
  Interpreted as new-feature scope, matching the failing "biggest impact
  / lowest effort" ratio the phasing above prioritizes first.
- **PERF C4** — refresh actions blocking on live API calls. The audit
  itself concludes this is *expected, correct* behavior for an explicit
  refresh, not a bug — no change recommended.
- **FEATURE #10 — Quick Launch's disappearance.** Requires a decision
  from the project owner (was removal intentional?), not a code change
  I can make unilaterally either direction.
- **ARCH EV1 (typed env schema), AB2 (shared adapter fetch helper), CD2
  (widget scaffolding script)** — real but pure engineering-hygiene
  investments with no user-facing effect; lower priority than anything
  above by this plan's own impact-first ordering.
- Everything in each audit's own "Low" tier beyond what Phase 1 already
  covers (e.g. UX AN1-AN3 animation timing tuning, SC1-SC3 scroll edge
  cases, G1/G2 gesture/haptics, R1/R2 responsive tuning) — real, but
  below the line for this pass given the impact/effort ordering; left
  in the source audits for a future pass.

## Verification after every phase

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- Small, focused commits — one per phase (or per logical unit within a
  larger phase), never bundled with the next phase's changes.
