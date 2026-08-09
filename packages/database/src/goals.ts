import { createServiceClient } from "./client";

export type GoalMetric =
  | "weight_kg"
  | "calories"
  | "protein_g"
  | "water_ml"
  | "milk_ml"
  | "workout_count";
export type GoalComparator = "at_least" | "at_most" | "exactly";
export type GoalCadence = "once" | "daily" | "weekly";

export interface Goal {
  id: string;
  title: string;
  metric: GoalMetric;
  comparator: GoalComparator;
  targetValue: number;
  cadence: GoalCadence;
  active: boolean;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    title: row.title as string,
    metric: row.metric as GoalMetric,
    comparator: row.comparator as GoalComparator,
    targetValue: Number(row.target_value),
    cadence: row.cadence as GoalCadence,
    active: row.active as boolean,
    achievedAt: row.achieved_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const SELECT_COLUMNS =
  "id, title, metric, comparator, target_value, cadence, active, achieved_at, created_at, updated_at";

export async function listGoals(
  userId: string,
  options: { activeOnly?: boolean; metric?: GoalMetric } = {},
): Promise<Goal[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("goals")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (options.activeOnly) query = query.eq("active", true);
  if (options.metric) query = query.eq("metric", options.metric);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list goals: ${error.message}`);
  return (data ?? []).map(mapRow);
}

export async function createGoal(
  userId: string,
  goal: {
    title: string;
    metric: GoalMetric;
    comparator: GoalComparator;
    targetValue: number;
    cadence: GoalCadence;
  },
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("goals").insert({
    user_id: userId,
    title: goal.title,
    metric: goal.metric,
    comparator: goal.comparator,
    target_value: goal.targetValue,
    cadence: goal.cadence,
  });

  if (error) throw new Error(`Failed to create goal: ${error.message}`);
}

export async function deactivateGoal(userId: string, goalId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("goals")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", goalId);

  if (error) throw new Error(`Failed to deactivate goal: ${error.message}`);
}
