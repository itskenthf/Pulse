export interface MetricProps {
  label: string;
  /** A raw count (GitHub's contribution stats) or an already-formatted
   *  string (Steam's "6.1h" / "2 days ago") — both are "one big labeled
   *  value," just with the formatting done by the caller in the latter
   *  case. */
  value: number | string;
  /** e.g. "d" for a day-count streak. Rendered smaller/muted, directly
   *  after the value, no space. Only meaningful with a numeric value —
   *  callers passing an already-formatted string value should fold any
   *  unit into that string instead. */
  suffix?: string;
}

/**
 * A single labeled value — GitHub's "Today"/"This week"/streak stats
 * were the first widget to need this shape, hand-rolled as a local
 * component; Steam's per-game detail page had its own near-identical
 * copy. Promoted to `@pulse/ui` so neither widget reinvents the same
 * markup, and the next one doesn't either.
 */
export function Metric({ label, value, suffix }: MetricProps) {
  return (
    <div className="flex flex-col">
      <span className="font-heading text-3xl font-semibold tracking-tight text-[var(--foreground)] tabular-nums">
        {value}
        {suffix && (
          <span className="text-lg font-semibold text-[var(--color-neutral-400)]">{suffix}</span>
        )}
      </span>
      <span className="text-xs text-[var(--color-neutral-500)]">{label}</span>
    </div>
  );
}
