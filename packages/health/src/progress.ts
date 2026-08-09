import type { GoalComparator } from "./goal-evaluation";

/**
 * Percent-of-the-way-there for a ProgressRing, shared across Weight
 * (weight-to-target), Nutrition (counter-to-target), and Meals
 * (checked-count-to-total) rather than each widget hand-rolling the same
 * clamp/direction math. `at_most` goals (e.g. a weight target below the
 * starting point) measure progress as ground covered, not raw ratio —
 * a `current` past the `start` toward `target` is what "100%" means,
 * not `current / target` which would be meaningless for a decreasing
 * metric with no natural zero.
 */
export function progressPercent(
  current: number,
  target: number,
  comparator: GoalComparator,
  start?: number,
): number {
  if (comparator === "at_most" && start !== undefined) {
    if (start === target) return current <= target ? 100 : 0;
    const covered = (start - current) / (start - target);
    return clamp(Math.round(covered * 100));
  }

  if (target === 0) return current >= 0 ? 100 : 0;
  return clamp(Math.round((current / target) * 100));
}

function clamp(percent: number): number {
  return Math.min(100, Math.max(0, percent));
}
