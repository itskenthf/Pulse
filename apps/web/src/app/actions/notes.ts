"use server";

import { createNote, deleteNote, updateNote } from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { NOTES_WIDGET_ID } from "@pulse/widget-notes";
import { runWidgetWriteAction } from "@/lib/run-widget-write-action";

const REVALIDATE_PATHS = ["/", "/notes"];

export async function addNoteAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: NOTES_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to create note",
    write: async (userId, formData) => {
      const title = formData.get("title");
      const body = formData.get("body");
      if (typeof title !== "string" || !title.trim()) {
        return { error: "Note title can't be empty" };
      }
      await createNote(userId, title.trim(), typeof body === "string" ? body : "");
    },
  });
}

export async function updateNoteAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: NOTES_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to update note",
    write: async (userId, formData) => {
      const noteId = formData.get("noteId");
      const title = formData.get("title");
      const body = formData.get("body");
      if (typeof noteId !== "string") {
        return { error: "Invalid note" };
      }
      await updateNote(userId, noteId, {
        title: typeof title === "string" ? title : undefined,
        body: typeof body === "string" ? body : undefined,
      });
    },
  });
}

export async function deleteNoteAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: NOTES_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to delete note",
    write: async (userId, formData) => {
      const noteId = formData.get("noteId");
      if (typeof noteId !== "string") {
        return { error: "Invalid note" };
      }
      await deleteNote(userId, noteId);
    },
  });
}
