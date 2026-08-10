import { z } from "zod";

const ratingSchema = z.number().int().min(1).max(5).nullable();

const weeklyReviewEntrySchema = z.object({
  id: z.string(),
  weekOf: z.string(),
  biggestAchievement: z.string().nullable(),
  biggestStruggle: z.string().nullable(),
  mood: ratingSchema,
  energy: ratingSchema,
  confidence: ratingSchema,
  sleepQuality: ratingSchema,
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk) — kept in sync with @pulse/database's
 * `WeeklyReview` by hand, same as Weight/Nutrition/Meals. `review` is
 * null when nothing's been saved for the current week yet — same
 * "read-only, no row yet" shape as Nutrition/Meals' `today`, but nullable
 * here since a blank week (all fields empty) is meaningfully different
 * from a week reviewed with every rating left at some default.
 */
export const weeklyReviewDataSchema = z.object({
  weekOf: z.string(),
  review: weeklyReviewEntrySchema.nullable(),
  weightKg: z.number().nullable(),
  isSunday: z.boolean(),
  fetchedAt: z.string(),
});

export type WeeklyReviewEntry = z.infer<typeof weeklyReviewEntrySchema>;
export type WeeklyReviewData = z.infer<typeof weeklyReviewDataSchema>;
