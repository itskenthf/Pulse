import { createServiceClient } from "./client";

export interface NotebookEntry {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const NOTEBOOK_ENTRY_MAX_LENGTH = 2000;

function mapRow(row: Record<string, unknown>): NotebookEntry {
  return {
    id: row.id as string,
    content: row.content as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function clampContent(content: string): string {
  return content.slice(0, NOTEBOOK_ENTRY_MAX_LENGTH);
}

/** `limit` omitted returns the user's full history — used by the
 *  `/notebook` "view all" page, since the widget's own `widget_cache`
 *  only ever holds the capped preview `fetchData()` reads. */
export async function listNotebookEntries(userId: string, limit?: number): Promise<NotebookEntry[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("notebook_entries")
    .select("id, content, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (limit !== undefined) query = query.limit(limit);

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list notebook entries: ${error.message}`);
  return (data ?? []).map(mapRow);
}

/** Returns the created row so the caller (the autosave client) can track
 *  its id and upsert into it on subsequent pauses instead of creating a
 *  new entry every time. */
export async function createNotebookEntry(userId: string, content: string): Promise<NotebookEntry> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("notebook_entries")
    .insert({ user_id: userId, content: clampContent(content) })
    .select("id, content, created_at, updated_at")
    .single();

  if (error) throw new Error(`Failed to create notebook entry: ${error.message}`);
  return mapRow(data);
}

export async function updateNotebookEntry(
  userId: string,
  entryId: string,
  content: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("notebook_entries")
    .update({ content: clampContent(content), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", entryId);

  if (error) throw new Error(`Failed to update notebook entry: ${error.message}`);
}
