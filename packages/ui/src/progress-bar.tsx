export interface ProgressBarProps {
  /** 0-100, clamped. */
  percent: number;
  /** Accessible label — e.g. "Calories, 1450 of 2800". Without one this
   *  reads as decorative only (matching ProgressRing's own centered-label
   *  convention: the caller supplies the human-readable number elsewhere). */
  label?: string;
}

/**
 * The one sanctioned accent-fill shape in this design system (see
 * docs/DESIGN_SYSTEM.md's "Progress indicators" note): a thin
 * `rounded-full` track with a solid `bg-[var(--color-accent)]` fill sized
 * via inline `width: %`. Reading's book-progress row and Steam's
 * achievement bar each hand-rolled this same two-`<div>` shape locally
 * before Nutrition/Meals needed a third and fourth copy — promoted here
 * so none of them re-implement it (per the widget-standards rule that
 * shared visual language belongs in `packages/ui`, not duplicated per
 * widget).
 */
export function ProgressBar({ percent, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      role={label ? "progressbar" : undefined}
      aria-label={label}
      aria-valuenow={label ? clamped : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      className="h-1.5 w-full overflow-hidden rounded-full border border-[var(--color-divider)]"
    >
      <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${clamped}%` }} />
    </div>
  );
}
