"use server";

import { revalidatePath } from "next/cache";
import { createNotebookEntry, updateNotebookEntry } from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { NOTEBOOK_WIDGET_ID } from "@pulse/widget-notebook";
import { auth } from "@/auth";
import { refreshWidget } from "@/lib/refresh-widget";

/** Same shape as actions/notes.ts — write → `refreshWidget` →
 *  `revalidatePath("/")` + `revalidatePath("/notebook")`, so autosaves
 *  reflect instantly on both the dashboard card and the full history
 *  page. `addEntryAction` additionally returns the created entry's id so
 *  the client can upsert into it on later autosaves while the box stays
 *  open. */

export async function addEntryAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const content = formData.get("content");
  if (typeof content !== "string" || !content.trim()) {
    return { error: "Entry can't be empty" };
  }

  try {
    const entry = await createNotebookEntry(session.user.id, content);
    await refreshWidget(NOTEBOOK_WIDGET_ID, session.user.id);
    revalidatePath("/");
    revalidatePath("/notebook");
    return { entryId: entry.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save entry" };
  }
}

export async function updateEntryAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const entryId = formData.get("entryId");
  const content = formData.get("content");
  if (typeof entryId !== "string" || typeof content !== "string") {
    return { error: "Invalid entry" };
  }

  try {
    await updateNotebookEntry(session.user.id, entryId, content);
    await refreshWidget(NOTEBOOK_WIDGET_ID, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save entry" };
  }

  revalidatePath("/");
  revalidatePath("/notebook");
  return { entryId };
}
