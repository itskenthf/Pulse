/**
 * Corner-radius scale. Named by role, not by t-shirt size — Pulse only
 * has three actually-distinct radii in use, each tied to a specific kind
 * of surface, so naming them after that surface is more useful than an
 * abstract sm/md/lg scale would be:
 *
 * - `chip`: small tiles, pills, dropdown panels — anything roughly
 *   icon-to-row sized (WidgetMenu/ProfileMenu dropdowns, Quick Launch
 *   tiles, GitHub's latest-commit row, Steam's cover art, the navbar).
 * - `card`: the standard WidgetCard shape (and anything matching it,
 *   like ErrorState/Skeleton).
 * - `hero`: the one full-width chromeless banner.
 *
 * Before this, these were three ad hoc literals repeated across files
 * with no shared name — `rounded-2xl`/`rounded-3xl` typed fresh at each
 * call site, and Hero's radius as a bare `rounded-[32px]` magic value
 * copy-pasted into its own Suspense skeleton. Centralizing them here
 * doesn't change how anything looks; it means a future radius change (or
 * a new primitive that needs to match an existing surface) has one
 * source of truth instead of hoping every call site agrees by hand.
 */
export const RADIUS = {
  chip: "rounded-2xl",
  card: "rounded-3xl",
  hero: "rounded-[2rem]",
} as const;
