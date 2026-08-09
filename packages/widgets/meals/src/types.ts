import { z } from "zod";

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk) — kept in sync with @pulse/database's
 * `MealCheck` by hand, same as Tasks/Nutrition.
 */
export const mealsDataSchema = z.object({
  today: z.object({
    loggedOn: z.string(),
    breakfast: z.boolean(),
    lunch: z.boolean(),
    dinner: z.boolean(),
    snack: z.boolean(),
  }),
  fetchedAt: z.string(),
});

export type MealsToday = z.infer<typeof mealsDataSchema>["today"];
export type MealsData = z.infer<typeof mealsDataSchema>;
