import type { MemoryEvent } from "@pulse/sdk";
import { isGoalMet } from "@pulse/health";
import type { WeightData } from "./types";

/** Only fires the moment a new log crosses the active goal from not-met to
 *  met — matches Tasks' "only completions are memory-worthy" diffing
 *  pattern, not every weigh-in. */
export function deriveWeightMemories(previous: WeightData | null, next: WeightData): MemoryEvent[] {
  const nextLatest = next.logs[0];
  if (!nextLatest || !next.goal) return [];

  const nowMet = isGoalMet(nextLatest.weightKg, next.goal.targetValue, next.goal.comparator);
  if (!nowMet) return [];

  const previousLatest = previous?.logs[0];
  const wasMetBefore =
    previous?.goal &&
    previousLatest &&
    isGoalMet(previousLatest.weightKg, previous.goal.targetValue, previous.goal.comparator);

  if (wasMetBefore) return [];

  return [{ title: `Reached your goal: ${next.goal.title}` }];
}
