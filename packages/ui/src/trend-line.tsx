export interface TrendLineProps {
  /** Chronological, oldest first. */
  points: number[];
  /** Optional reference value (e.g. a weight goal) drawn as a dashed
   *  hairline, not a second data series. */
  goalValue?: number;
  width?: number;
  height?: number;
}

/**
 * A hand-rolled hairline sparkline — no charting library exists in this
 * repo, and a filled area-under-curve (a typical charting-library default)
 * is exactly the look docs/DESIGN_SYSTEM.md's no-fills/no-gradients rule
 * prohibits, so a single stroked `<polyline>` is both the simplest and the
 * most design-system-correct choice.
 */
export function TrendLine({ points, goalValue, width = 240, height = 64 }: TrendLineProps) {
  if (points.length === 0) {
    return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" />;
  }

  const padding = 4;
  const min = Math.min(...points, goalValue ?? points[0]!);
  const max = Math.max(...points, goalValue ?? points[0]!);
  const range = max - min || 1;

  const toX = (index: number) =>
    points.length === 1 ? width / 2 : padding + (index / (points.length - 1)) * (width - padding * 2);
  const toY = (value: number) => height - padding - ((value - min) / range) * (height - padding * 2);

  const coords = points.map((value, index) => `${toX(index)},${toY(value)}`).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend over time">
      {goalValue !== undefined && (
        <line
          x1={0}
          x2={width}
          y1={toY(goalValue)}
          y2={toY(goalValue)}
          stroke="var(--color-divider)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}
      <polyline
        points={coords}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
