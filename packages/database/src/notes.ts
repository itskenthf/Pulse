import { createServiceClient } from "./client";

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listNotes(userId: string): Promise<Note[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, body, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list notes: ${error.message}`);
  return (data ?? []).map(mapRow);
}

export async function createNote(userId: string, title: string, body: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("notes").insert({ user_id: userId, title, body });

  if (error) throw new Error(`Failed to create note: ${error.message}`);
}

export async function updateNote(
  userId: string,
  noteId: string,
  fields: { title?: string; body?: string },
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("notes")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", noteId);

  if (error) throw new Error(`Failed to update note: ${error.message}`);
}

export async function deleteNote(userId: string, noteId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("notes").delete().eq("user_id", userId).eq("id", noteId);

  if (error) throw new Error(`Failed to delete note: ${error.message}`);
}
