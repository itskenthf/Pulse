import { createServiceClient } from "./client";

export interface NutritionLog {
  loggedOn: string;
  calories: number;
  proteinG: number;
  waterMl: number;
  milkMl: number;
}

function mapRow(row: Record<string, unknown>): NutritionLog {
  return {
    loggedOn: row.logged_on as string,
    calories: row.calories as number,
    proteinG: row.protein_g as number,
    waterMl: row.water_ml as number,
    milkMl: row.milk_ml as number,
  };
}

/**
 * The Nutrition widget itself was removed 2026-08-13 (see
 * docs/DECISIONS.md) — this is the one read Insights still needs for its
 * nutrition goal-adherence observation, kept alongside `nutrition_logs`
 * itself rather than dropped, since existing history/goals stay valid
 * data to read even with no UI left to create more of it.
 */
export async function listNutritionHistory(userId: string, days: number): Promise<NutritionLog[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("nutrition_logs")
    .select("logged_on, calories, protein_g, water_ml, milk_ml")
    .eq("user_id", userId)
    .order("logged_on", { ascending: false })
    .limit(days);

  if (error) throw new Error(`Failed to list nutrition history: ${error.message}`);
  return (data ?? []).map(mapRow);
}
