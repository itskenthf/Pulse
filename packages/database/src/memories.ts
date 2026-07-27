import type { MemoryEvent } from "@pulse/sdk";
import { createServiceClient } from "./client";

export interface Memory {
  id: string;
  source: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Bulk-inserts the memory-worthy events a widget's `deriveMemories`
 * detected for this refresh. No-ops on an empty list — every widget
 * refresh calls this, and most refreshes detect nothing new.
 */
export async function writeMemories(
  userId: string,
  source: string,
  events: MemoryEvent[],
): Promise<void> {
  if (events.length === 0) return;

  const supabase = createServiceClient();
  const { error } = await supabase.from("memories").insert(
    events.map((event) => ({
      user_id: userId,
      source,
      title: event.title,
      description: event.description ?? null,
      metadata: event.metadata ?? {},
    })),
  );

  if (error) throw new Error(`Failed to write memories: ${error.message}`);
}

/** Most recent memories for the Timeline page, newest first. */
export async function listMemories(userId: string, limit = 200): Promise<Memory[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("memories")
    .select("id, source, title, description, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to list memories: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    source: row.source as string,
    title: row.title as string,
    description: row.description as string | null,
    metadata: row.metadata as Record<string, unknown>,
    createdAt: row.created_at as string,
  }));
}
