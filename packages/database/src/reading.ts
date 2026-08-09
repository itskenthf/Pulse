import { createServiceClient } from "./client";

export interface Reading {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  totalPage: number;
  status: "reading" | "finished";
  finishedAt: string | null;
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
    status: row.status as "reading" | "finished",
    finishedAt: row.finished_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listBooks(userId: string): Promise<Reading[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reading")
    .select(
      "id, title, author, current_page, total_page, status, finished_at, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to list books: ${error.message}`);
  return (data ?? []).map(mapRow);
}

export async function addBook(
  userId: string,
  book: { title: string; author: string; totalPage: number },
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("reading").insert({
    user_id: userId,
    title: book.title,
    author: book.author,
    total_page: book.totalPage,
  });

  if (error) throw new Error(`Failed to add book: ${error.message}`);
}

export async function updateBookProgress(
  userId: string,
  bookId: string,
  currentPage: number,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("reading")
    .update({ current_page: currentPage, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", bookId);

  if (error) throw new Error(`Failed to update progress: ${error.message}`);
}

export async function markBookFinished(userId: string, bookId: string): Promise<void> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("reading")
    .update({ status: "finished", finished_at: now, updated_at: now })
    .eq("user_id", userId)
    .eq("id", bookId);

  if (error) throw new Error(`Failed to mark book finished: ${error.message}`);
}

export async function deleteBook(userId: string, bookId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("reading")
    .delete()
    .eq("user_id", userId)
    .eq("id", bookId);

  if (error) throw new Error(`Failed to delete book: ${error.message}`);
}
