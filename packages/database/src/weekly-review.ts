import { currentWeekStart } from "@pulse/health";
import { createServiceClient } from "./client";

export interface WeeklyReview {
  id: string;
  weekOf: string;
  biggestAchievement: string | null;
  biggestStruggle: string | null;
  mood: number | null;
  energy: number | null;
  confidence: number | null;
  sleepQuality: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const SELECT_COLUMNS =
  "id, week_of, biggest_achievement, biggest_struggle, mood, energy, confidence, sleep_quality, notes, created_at, updated_at";

function mapRow(row: Record<string, unknown>): WeeklyReview {
  return {
    id: row.id as string,
    weekOf: row.week_of as string,
    biggestAchievement: row.biggest_achievement as string | null,
    biggestStruggle: row.biggest_struggle as string | null,
    mood: row.mood as number | null,
    energy: row.energy as number | null,
    confidence: row.confidence as number | null,
    sleepQuality: row.sleep_quality as number | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Reads the current ISO week's review, or null if nothing's been saved
 *  for it yet — never writes, matching getTodayNutrition/getTodayMeals'
 *  read-only "no row yet" handling. */
export async function getCurrentWeekReview(userId: string): Promise<WeeklyReview | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .eq("week_of", currentWeekStart())
    .maybeSingle();

  if (error) throw new Error(`Failed to read this week's review: ${error.message}`);
  return data ? mapRow(data) : null;
}

export async function upsertCurrentWeekReview(
  userId: string,
  review: {
    biggestAchievement?: string | null;
    biggestStruggle?: string | null;
    mood?: number | null;
    energy?: number | null;
    confidence?: number | null;
    sleepQuality?: number | null;
    notes?: string | null;
  },
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("weekly_reviews").upsert(
    {
      user_id: userId,
      week_of: currentWeekStart(),
      biggest_achievement: review.biggestAchievement ?? null,
      biggest_struggle: review.biggestStruggle ?? null,
      mood: review.mood ?? null,
      energy: review.energy ?? null,
      confidence: review.confidence ?? null,
      sleep_quality: review.sleepQuality ?? null,
      notes: review.notes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,week_of" },
  );

  if (error) throw new Error(`Failed to save this week's review: ${error.message}`);
}

export async function listWeeklyReviews(userId: string, limit: number): Promise<WeeklyReview[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("week_of", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to list weekly reviews: ${error.message}`);
  return (data ?? []).map(mapRow);
}
