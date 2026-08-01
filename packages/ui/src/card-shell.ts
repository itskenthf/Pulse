import { GLASS_HOVER, glassClass } from "./glass";
import { RADIUS } from "./tokens";

export interface CardShellOptions {
  /** Defaults to WidgetCard's own `p-5`; ErrorState uses `p-6` for extra
   *  breathing room since it fully replaces a widget's content. */
  padding?: string;
  /** EmptyState/ErrorState's floor height so a near-empty state still
   *  reads as an intentional block, not a sliver. */
  minHeight?: string;
  /** Only WidgetCard itself gets the hover border cue — Skeleton and
   *  ErrorState aren't interactive surfaces. */
  hover?: boolean;
}

/**
 * The card-shaped chrome shared by `WidgetCard`, `Skeleton`'s "card"
 * variant, and `ErrorState` — flex column, standard corner radius, flat
 * paper surface (see docs/DESIGN_SYSTEM.md). Previously each of the
 * three hand-typed this same className string independently (see
 * docs/DECISIONS.md's dashboard-rebuild entry) — this is that shared
 * shape in one place, with the few real per-caller differences
 * (padding, a min-height floor, the hover cue) as parameters rather
 * than copy-pasted variations.
 */
export function cardShellClass({ padding = "p-5", minHeight, hover = false }: CardShellOptions = {}): string {
  return [
    "flex h-full min-w-0 flex-col gap-4",
    RADIUS.card,
    padding,
    minHeight,
    glassClass("light"),
    hover ? GLASS_HOVER : "",
  ]
    .filter(Boolean)
    .join(" ");
}
