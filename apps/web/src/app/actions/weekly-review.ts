"use server";

import { upsertCurrentWeekReview } from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { WEEKLY_REVIEW_WIDGET_ID } from "@pulse/widget-weekly-review";
import { runWidgetWriteAction } from "@/lib/run-widget-write-action";

const REVALIDATE_PATHS = ["/", "/health/weekly-review"];

function parseRating(
  formData: FormData,
  field: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const raw = formData.get(field);
  if (typeof raw !== "string" || raw === "") return { ok: true, value: null };

  const num = Number(raw);
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    return { ok: false, error: `${field} must be between 1 and 5` };
  }
  return { ok: true, value: num };
}

function parseText(formData: FormData, field: string): string | null {
  const raw = formData.get(field);
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export async function saveReviewAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: WEEKLY_REVIEW_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to save review",
    write: async (userId, formData) => {
      const ratingFields = ["mood", "energy", "confidence", "sleepQuality"] as const;
      const ratings: Record<string, number | null> = {};
      for (const field of ratingFields) {
        const result = parseRating(formData, field);
        if (!result.ok) return { error: result.error };
        ratings[field] = result.value;
      }

      await upsertCurrentWeekReview(userId, {
        biggestAchievement: parseText(formData, "biggestAchievement"),
        biggestStruggle: parseText(formData, "biggestStruggle"),
        mood: ratings.mood,
        energy: ratings.energy,
        confidence: ratings.confidence,
        sleepQuality: ratings.sleepQuality,
        notes: parseText(formData, "notes"),
      });
    },
  });
}
