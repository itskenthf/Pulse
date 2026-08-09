import { z } from "zod";

const nutritionTodaySchema = z.object({
  loggedOn: z.string(),
  calories: z.number().int().nonnegative(),
  proteinG: z.number().int().nonnegative(),
  waterMl: z.number().int().nonnegative(),
  milkMl: z.number().int().nonnegative(),
});

const nutritionGoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  metric: z.enum(["calories", "protein_g", "water_ml", "milk_ml"]),
  targetValue: z.number(),
  comparator: z.enum(["at_least", "at_most", "exactly"]),
});

const nutritionHistoryPointSchema = z.object({
  loggedOn: z.string(),
  calories: z.number().int().nonnegative(),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk) — kept in sync with @pulse/database's
 * `NutritionLog`/`Goal` by hand, same as Tasks/Weight. `history` carries
 * only calories (not all four counters) — it exists solely to feed the
 * dashboard card's inline sparkline, and calories is the one metric shown
 * there; the other three get their own trend view on the detail page.
 */
export const nutritionDataSchema = z.object({
  today: nutritionTodaySchema,
  goals: z.array(nutritionGoalSchema),
  history: z.array(nutritionHistoryPointSchema),
  fetchedAt: z.string(),
});

export type NutritionToday = z.infer<typeof nutritionTodaySchema>;
export type NutritionGoal = z.infer<typeof nutritionGoalSchema>;
export type NutritionHistoryPoint = z.infer<typeof nutritionHistoryPointSchema>;
export type NutritionData = z.infer<typeof nutritionDataSchema>;
