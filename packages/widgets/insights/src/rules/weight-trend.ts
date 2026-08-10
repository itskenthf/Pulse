export interface WeightTrendPoint {
  loggedOn: string;
  weightKg: number;
}

/**
 * "You gained/lost X kg this month" — compares the earliest and latest
 * weigh-in within the trailing window. Needs at least two logs to say
 * anything (a single weigh-in has no trend), and rounds to one decimal
 * so a 0.04kg scale-noise blip doesn't get reported as a real change.
 */
export function weightTrendInsight(logs: WeightTrendPoint[]): string | null {
  if (logs.length < 2) return null;

  const sorted = [...logs].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const deltaKg = Math.round((last.weightKg - first.weightKg) * 10) / 10;

  if (deltaKg === 0) return "Your weight has held steady this month.";

  const direction = deltaKg > 0 ? "gained" : "lost";
  return `You've ${direction} ${Math.abs(deltaKg)}kg this month.`;
}
