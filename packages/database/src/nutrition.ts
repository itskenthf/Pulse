import { todayInTimeZone } from "@pulse/health";
import { createServiceClient } from "./client";

export type NutritionField = "calories" | "protein_g" | "water_ml" | "milk_ml";

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

function emptyLog(loggedOn: string): NutritionLog {
  return { loggedOn, calories: 0, proteinG: 0, waterMl: 0, milkMl: 0 };
}

/** Reads today's row, returning zeroed counters if nothing has been
 *  logged yet — never writes, so a dashboard view alone doesn't create a
 *  row (only an actual log/increment does). */
export async function getTodayNutrition(userId: string): Promise<NutritionLog> {
  const supabase = createServiceClient();
  const loggedOn = todayInTimeZone();
  const { data, error } = await supabase
    .from("nutrition_logs")
    .select("logged_on, calories, protein_g, water_ml, milk_ml")
    .eq("user_id", userId)
    .eq("logged_on", loggedOn)
    .maybeSingle();

  if (error) throw new Error(`Failed to read today's nutrition: ${error.message}`);
  return data ? mapRow(data) : emptyLog(loggedOn);
}

const COLUMN_BY_FIELD: Record<NutritionField, string> = {
  calories: "calories",
  protein_g: "protein_g",
  water_ml: "water_ml",
  milk_ml: "milk_ml",
};

/** Reads today's row (if any), adds `amount` to `field`, and upserts the
 *  full row. A single-user app has no real concurrent-tap risk, so a
 *  plain read-then-write is simpler than introducing this codebase's
 *  first Postgres function just for atomic increments. */
export async function incrementNutrition(
  userId: string,
  field: NutritionField,
  amount: number,
): Promise<void> {
  const supabase = createServiceClient();
  const current = await getTodayNutrition(userId);
  const column = COLUMN_BY_FIELD[field];
  const currentValue = { calories: current.calories, protein_g: current.proteinG, water_ml: current.waterMl, milk_ml: current.milkMl }[field];

  const { error } = await supabase.from("nutrition_logs").upsert(
    {
      user_id: userId,
      logged_on: current.loggedOn,
      [column]: currentValue + amount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,logged_on" },
  );

  if (error) throw new Error(`Failed to log ${field}: ${error.message}`);
}

export async function setNutritionField(
  userId: string,
  field: NutritionField,
  value: number,
): Promise<void> {
  const supabase = createServiceClient();
  const loggedOn = todayInTimeZone();
  const column = COLUMN_BY_FIELD[field];

  const { error } = await supabase.from("nutrition_logs").upsert(
    { user_id: userId, logged_on: loggedOn, [column]: value, updated_at: new Date().toISOString() },
    { onConflict: "user_id,logged_on" },
  );

  if (error) throw new Error(`Failed to set ${field}: ${error.message}`);
}

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
