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
 * Values match Classical's `--radius-md`/`--radius-lg` (4px/7px) — the
 * system keeps radii small and editorial rather than the soft, pill-like
 * curves the previous Liquid Glass system used.
 */
export const RADIUS = {
  chip: "rounded-[4px]",
  card: "rounded-[7px]",
  hero: "rounded-[7px]",
} as const;
