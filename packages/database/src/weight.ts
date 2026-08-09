import { todayInTimeZone } from "@pulse/health";
import { createServiceClient } from "./client";

export interface WeightLog {
  id: string;
  weightKg: number;
  loggedOn: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: Record<string, unknown>): WeightLog {
  return {
    id: row.id as string,
    weightKg: Number(row.weight_kg),
    loggedOn: row.logged_on as string,
    note: row.note as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Newest first — callers needing chronological order for a trend graph
 *  reverse this themselves rather than this always sorting one way. */
export async function listWeightLogs(userId: string, limit?: number): Promise<WeightLog[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("weight_logs")
    .select("id, weight_kg, logged_on, note, created_at, updated_at")
    .eq("user_id", userId)
    .order("logged_on", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list weight logs: ${error.message}`);
  return (data ?? []).map(mapRow);
}

export async function logWeight(
  userId: string,
  entry: { weightKg: number; loggedOn?: string; note?: string },
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("weight_logs").insert({
    user_id: userId,
    weight_kg: entry.weightKg,
    logged_on: entry.loggedOn ?? todayInTimeZone(),
    note: entry.note ?? null,
  });

  if (error) throw new Error(`Failed to log weight: ${error.message}`);
}

export async function deleteWeightLog(userId: string, logId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("weight_logs")
    .delete()
    .eq("user_id", userId)
    .eq("id", logId);

  if (error) throw new Error(`Failed to delete weight log: ${error.message}`);
}
