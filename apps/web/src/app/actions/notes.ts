"use server";

import { revalidatePath } from "next/cache";
import { createNote, deleteNote, updateNote } from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { NOTES_WIDGET_ID } from "@pulse/widget-notes";
import { auth } from "@/auth";
import { refreshWidget } from "@/lib/refresh-widget";

/** Same shape as actions/tasks.ts — write → `refreshWidget` →
 *  `revalidatePath("/")`, so mutations reflect instantly. */

export async function addNoteAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const title = formData.get("title");
  const body = formData.get("body");
  if (typeof title !== "string" || !title.trim()) {
    return { error: "Note title can't be empty" };
  }

  try {
    await createNote(session.user.id, title.trim(), typeof body === "string" ? body : "");
    await refreshWidget(NOTES_WIDGET_ID, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create note" };
  }

  revalidatePath("/");
  revalidatePath("/notes");
  return {};
}

export async function updateNoteAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const noteId = formData.get("noteId");
  const title = formData.get("title");
  const body = formData.get("body");
  if (typeof noteId !== "string") {
    return { error: "Invalid note" };
  }

  try {
    await updateNote(session.user.id, noteId, {
      title: typeof title === "string" ? title : undefined,
      body: typeof body === "string" ? body : undefined,
    });
    await refreshWidget(NOTES_WIDGET_ID, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update note" };
  }

  revalidatePath("/");
  revalidatePath("/notes");
  return {};
}

export async function deleteNoteAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const noteId = formData.get("noteId");
  if (typeof noteId !== "string") {
    return { error: "Invalid note" };
  }

  try {
    await deleteNote(session.user.id, noteId);
    await refreshWidget(NOTES_WIDGET_ID, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete note" };
  }

  revalidatePath("/");
  revalidatePath("/notes");
  return {};
}
