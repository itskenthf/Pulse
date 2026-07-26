import { glassClass } from "./glass";
import { RADIUS } from "./tokens";

export interface SkeletonProps {
  /** "hero" matches the chromeless full-width banner's shape; every other
   *  widget size shares the same WidgetCard-shaped skeleton — the grid's
   *  column span (not skeleton content) is what varies by size. The hero
   *  variant's border/padding is owned by its full-bleed wrapper in
   *  apps/web's WidgetGrid, not the skeleton itself, so the loading state
   *  lines up with the live divider instead of drawing its own. */
  variant?: "hero" | "card";
}

const PULSE_BLOCK = "animate-pulse motion-reduce:animate-none rounded-xl bg-zinc-950/10 dark:bg-white/10";

/** Suspense fallback shown while a widget's cache read is in flight —
 *  lets other widgets stream in without waiting on the slowest one. */
export function Skeleton({ variant = "card" }: SkeletonProps) {
  if (variant === "hero") {
    return (
      <div aria-hidden="true" className={`flex flex-col gap-5 ${RADIUS.hero}`}>
        <div className={`h-10 w-2/3 ${PULSE_BLOCK}`} />
        <div className={`h-4 w-full max-w-2xl ${PULSE_BLOCK}`} />
        <div className={`h-4 w-1/3 ${PULSE_BLOCK}`} />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`flex h-full flex-col gap-4 ${RADIUS.card} p-5 ${glassClass("light")}`}
    >
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 shrink-0 ${RADIUS.chip} ${PULSE_BLOCK}`} />
        <div className={`h-4 w-24 ${PULSE_BLOCK}`} />
      </div>
      <div className="flex flex-col gap-2">
        <div className={`h-4 w-full ${PULSE_BLOCK}`} />
        <div className={`h-4 w-5/6 ${PULSE_BLOCK}`} />
        <div className={`h-4 w-2/3 ${PULSE_BLOCK}`} />
      </div>
    </div>
  );
}
