import type { MemoryEvent } from "@pulse/sdk";
import type { WeeklyReviewData } from "./types";

/**
 * Fires once when a review is first saved for the current week, not on
 * every subsequent edit — `saveReviewAction` upserts, so the same week's
 * review can be saved multiple times before Sunday. Matches Weight's
 * "fires once on completion, not on every edit" approach. See the doc
 * comment on `Widget.deriveMemories` in @pulse/sdk for why this diffs
 * against the previous snapshot rather than firing on every fetch.
 */
export function deriveWeeklyReviewMemories(
  previous: WeeklyReviewData | null,
  next: WeeklyReviewData,
): MemoryEvent[] {
  if (!next.review) return [];

  const alreadyReviewedThisWeek =
    previous?.review != null && previous.weekOf === next.weekOf;
  if (alreadyReviewedThisWeek) return [];

  return [{ title: "Completed your weekly review" }];
}
