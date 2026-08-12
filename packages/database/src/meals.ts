import { todayInTimeZone } from "@pulse/health";
import { createServiceClient } from "./client";

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealCheck {
  loggedOn: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  snack: boolean;
}

function mapRow(row: Record<string, unknown>): MealCheck {
  return {
    loggedOn: row.logged_on as string,
    breakfast: row.breakfast as boolean,
    lunch: row.lunch as boolean,
    dinner: row.dinner as boolean,
    snack: row.snack as boolean,
  };
}

function emptyCheck(loggedOn: string): MealCheck {
  return { loggedOn, breakfast: false, lunch: false, dinner: false, snack: false };
}

export async function getTodayMeals(userId: string): Promise<MealCheck> {
  const supabase = createServiceClient();
  const loggedOn = todayInTimeZone();
  const { data, error } = await supabase
    .from("meal_checks")
    .select("logged_on, breakfast, lunch, dinner, snack")
    .eq("user_id", userId)
    .eq("logged_on", loggedOn)
    .maybeSingle();

  if (error) throw new Error(`Failed to read today's meals: ${error.message}`);
  return data ? mapRow(data) : emptyCheck(loggedOn);
}

/**
 * Returns the full resulting row (via `.select()` on the same upsert
 * statement — no separate read) so a caller that needs the widget's new
 * complete state after this write doesn't have to re-query for it; Meals'
 * fetchData is exactly this one row, so its refresh action can hand this
 * straight to `refreshWidget`'s `knownData` instead of a redundant
 * `getTodayMeals` re-read right after.
 */
export async function setMealChecked(userId: string, meal: Meal, checked: boolean): Promise<MealCheck> {
  const supabase = createServiceClient();
  const loggedOn = todayInTimeZone();

  const { data, error } = await supabase
    .from("meal_checks")
    .upsert(
      { user_id: userId, logged_on: loggedOn, [meal]: checked, updated_at: new Date().toISOString() },
      { onConflict: "user_id,logged_on" },
    )
    .select("logged_on, breakfast, lunch, dinner, snack")
    .single();

  if (error) throw new Error(`Failed to update ${meal}: ${error.message}`);
  return mapRow(data);
}

export async function listMealHistory(userId: string, days: number): Promise<MealCheck[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("meal_checks")
    .select("logged_on, breakfast, lunch, dinner, snack")
    .eq("user_id", userId)
    .order("logged_on", { ascending: false })
    .limit(days);

  if (error) throw new Error(`Failed to list meal history: ${error.message}`);
  return (data ?? []).map(mapRow);
}
