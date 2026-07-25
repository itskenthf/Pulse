export type GlassLevel = "light" | "medium" | "heavy";

/**
 * Three reusable glass materials (design system: light/medium/heavy).
 * Each combines a tinted translucent fill, blur, a thin border, an inset
 * highlight ring, and a layered ambient shadow. Fill opacity is kept low
 * enough that the page's background blobs actually read through — a
 * card at 55%+ white sitting on a near-white page base is indistinguishable
 * from a solid surface, which is what "glass looked white" traced back to.
 * `heavy` stays more opaque since it's used for text-dense overlays
 * (dropdowns) where legibility matters more than translucency.
 */
const GLASS: Record<GlassLevel, string> = {
  light:
    "bg-white/30 dark:bg-zinc-900/30 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_1px_1px_rgba(255,255,255,0.7),0_20px_40px_-16px_rgba(15,23,42,0.22)] dark:shadow-[0_1px_1px_rgba(255,255,255,0.04),0_20px_40px_-16px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-white/40 dark:ring-white/5",
  medium:
    "bg-white/38 dark:bg-zinc-900/40 backdrop-blur-2xl border border-white/55 dark:border-white/10 shadow-[0_1px_1px_rgba(255,255,255,0.7),0_24px_48px_-20px_rgba(15,23,42,0.26)] dark:shadow-[0_1px_1px_rgba(255,255,255,0.04),0_24px_48px_-20px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/45 dark:ring-white/5",
  heavy:
    "bg-white/60 dark:bg-zinc-900/70 backdrop-blur-2xl border border-white/70 dark:border-white/10 shadow-[0_1px_1px_rgba(255,255,255,0.7),0_32px_64px_-24px_rgba(15,23,42,0.32)] dark:shadow-[0_1px_1px_rgba(255,255,255,0.04),0_32px_64px_-24px_rgba(0,0,0,0.65)] ring-1 ring-inset ring-white/60 dark:ring-white/10",
};

export function glassClass(level: GlassLevel = "light"): string {
  return GLASS[level];
}

/** A static "you're over this" cue — brighter border/ring — with no
 *  movement or scale, for large surfaces (cards) where a lift/scale
 *  effect reads as distracting rather than helpful. */
export const GLASS_HOVER =
  "transition-colors duration-150 ease-out hover:border-white/80 dark:hover:border-white/25 hover:ring-white/60 dark:hover:ring-white/15";
export const SPRING_PRESS =
  "transition-transform duration-150 ease-out motion-safe:hover:scale-105 motion-safe:active:scale-95";
