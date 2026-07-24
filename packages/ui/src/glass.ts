export type GlassLevel = "light" | "medium" | "heavy";

/**
 * Three reusable glass materials (design system: light/medium/heavy).
 * Each combines a tinted translucent fill, blur, a thin border, an inset
 * highlight ring (the "soft inner highlight" a flat bg-white/opacity
 * card doesn't have), and a layered ambient shadow — never just a
 * lowered-opacity white box.
 */
const GLASS: Record<GlassLevel, string> = {
  light:
    "bg-white/55 dark:bg-zinc-900/45 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-[0_1px_1px_rgba(255,255,255,0.6),0_20px_40px_-16px_rgba(15,23,42,0.18)] dark:shadow-[0_1px_1px_rgba(255,255,255,0.04),0_20px_40px_-16px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/50 dark:ring-white/5",
  medium:
    "bg-white/65 dark:bg-zinc-900/55 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_1px_1px_rgba(255,255,255,0.6),0_24px_48px_-20px_rgba(15,23,42,0.22)] dark:shadow-[0_1px_1px_rgba(255,255,255,0.04),0_24px_48px_-20px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-white/50 dark:ring-white/5",
  heavy:
    "bg-white/80 dark:bg-zinc-900/75 backdrop-blur-2xl border border-white/70 dark:border-white/10 shadow-[0_1px_1px_rgba(255,255,255,0.7),0_32px_64px_-24px_rgba(15,23,42,0.3)] dark:shadow-[0_1px_1px_rgba(255,255,255,0.04),0_32px_64px_-24px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/60 dark:ring-white/10",
};

export function glassClass(level: GlassLevel = "light"): string {
  return GLASS[level];
}

/** Gentle elevation + spring-ish scale on interaction, skipped entirely
 *  under prefers-reduced-motion via the motion-safe: variant. */
export const GLASS_HOVER =
  "transition-[transform,box-shadow] duration-200 ease-out motion-safe:hover:-translate-y-0.5";
export const SPRING_PRESS =
  "transition-transform duration-150 ease-out motion-safe:hover:scale-105 motion-safe:active:scale-95";
