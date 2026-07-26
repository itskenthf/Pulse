export type GlassLevel = "light" | "medium" | "heavy";

/**
 * Three reusable surfaces (design system: light/medium/heavy — see
 * docs/DESIGN_SYSTEM.md). Classical draws with hairlines and a whisper of
 * elevation rather than translucency/blur: each level is the same flat
 * paper-toned card with a 1px divider-colored border and a shadow that
 * only deepens step to step. `heavy` is used for text-dense overlays
 * (dropdowns) where a slightly stronger shadow helps them read as "above"
 * the page.
 */
const GLASS: Record<GlassLevel, string> = {
  light:
    "bg-[var(--background)] border border-[var(--color-divider)] shadow-[0_1px_2px_color-mix(in_srgb,#2d2b2b_14%,transparent)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
  medium:
    "bg-[var(--background)] border border-[var(--color-divider)] shadow-[0_3px_10px_color-mix(in_srgb,#2d2b2b_16%,transparent)] dark:shadow-[0_3px_10px_rgba(0,0,0,0.45)]",
  heavy:
    "bg-[var(--background)] border border-[var(--color-divider)] shadow-[0_12px_32px_color-mix(in_srgb,#2d2b2b_22%,transparent)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.55)]",
};

export function glassClass(level: GlassLevel = "light"): string {
  return GLASS[level];
}

/** A static "you're over this" cue — the border darkens to the accent —
 *  with no movement or scale, for large surfaces (cards) where a lift/scale
 *  effect reads as distracting rather than helpful. */
export const GLASS_HOVER =
  "transition-colors duration-150 ease-out hover:border-[var(--color-accent)]";
export const SPRING_PRESS =
  "transition-transform duration-150 ease-out motion-safe:hover:scale-105 motion-safe:active:scale-95";

/**
 * The small bordered "chip" surface used for compact interactive rows —
 * a hairline-and-hover treatment distinct from `glassClass` (which also
 * adds a heavier shadow, meant for a whole card/panel, not a single row or
 * icon tile). Radius is deliberately excluded — callers apply `RADIUS.chip`
 * (or another token) themselves, since a couple of chip-shaped surfaces
 * (e.g. a circular avatar button) need a different radius than the default.
 * Previously copy-pasted verbatim between GitHub's latest-commit row and
 * Quick Launch's link tiles.
 */
export const GLASS_CHIP =
  "bg-transparent border border-[var(--color-divider)] transition hover:border-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]";
