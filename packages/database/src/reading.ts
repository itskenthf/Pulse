import { createServiceClient } from "./client";

export interface Reading {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  totalPage: number;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: Record<string, unknown>): Reading {
  return {
    id: row.id as string,
    title: row.title as string,
    author: row.author as string,
    currentPage: row.current_page as number,
    totalPage: row.total_page as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getCurrentBook(userId: string): Promise<Reading | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reading")
    .select("id, title, author, current_page, total_page, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to read current book: ${error.message}`);
  return data ? mapRow(data) : null;
}

export async function startBook(
  userId: string,
  book: { title: string; author: string; totalPage: number },
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("reading").upsert(
    {
      user_id: userId,
      title: book.title,
      author: book.author,
      total_page: book.totalPage,
      current_page: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(`Failed to start book: ${error.message}`);
}

export async function updateReadingProgress(userId: string, currentPage: number): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("reading")
    .update({ current_page: currentPage, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to update progress: ${error.message}`);
}

export async function clearBook(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("reading").delete().eq("user_id", userId);

  if (error) throw new Error(`Failed to clear book: ${error.message}`);
}
