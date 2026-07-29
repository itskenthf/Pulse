import { createServiceClient } from "./client";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    completed: row.completed as boolean,
    dueAt: row.due_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listTasks(userId: string): Promise<Task[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, completed, due_at, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list tasks: ${error.message}`);
  return (data ?? []).map(mapRow);
}

export async function createTask(
  userId: string,
  title: string,
  dueAt?: string | null,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tasks")
    .insert({ user_id: userId, title, due_at: dueAt ?? null });

  if (error) throw new Error(`Failed to create task: ${error.message}`);
}

export async function setTaskCompleted(
  userId: string,
  taskId: string,
  completed: boolean,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tasks")
    .update({ completed, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", taskId);

  if (error) throw new Error(`Failed to update task: ${error.message}`);
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("tasks").delete().eq("user_id", userId).eq("id", taskId);

  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}
