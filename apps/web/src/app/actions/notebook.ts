"use server";

import { revalidatePath } from "next/cache";
import { createNotebookEntry, updateNotebookEntry } from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { NOTEBOOK_WIDGET_ID } from "@pulse/widget-notebook";
import { auth } from "@/auth";
import { runWidgetWriteAction } from "@/lib/run-widget-write-action";

/**
 * `addEntryAction` fires once per new entry (infrequent) and follows the
 * shared `runWidgetWriteAction` shape (write → `refreshWidget` →
 * `revalidatePath("/")` + `revalidatePath("/notebook")`), so the new entry
 * shows up on both surfaces right away. It also returns the created
 * entry's id so the client can upsert into it on later autosaves while
 * the box stays open.
 *
 * `updateEntryAction` fires on every autosave pause *while composing* —
 * potentially many times for one entry — so it deliberately skips
 * `refreshWidget` (a full fetchData + widget_cache write) and
 * `revalidatePath("/")` (which would re-render every widget on the
 * dashboard, not just this one) — i.e. it deliberately does *not* use
 * `runWidgetWriteAction`, which always does both. Doing that on every
 * keystroke pause made the whole page feel laggy while typing. The write
 * is still fully durable; the dashboard card's copy of this entry catches
 * up via the widget's 15-minute cron backstop or the next
 * `addEntryAction`. Keeps only the cheap `revalidatePath("/notebook")` so
 * the full history page stays reasonably fresh.
 */

export async function addEntryAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: NOTEBOOK_WIDGET_ID,
    revalidatePaths: ["/", "/notebook"],
    errorMessage: "Failed to save entry",
    write: async (userId, formData) => {
      const content = formData.get("content");
      if (typeof content !== "string" || !content.trim()) {
        return { error: "Entry can't be empty" };
      }
      const entry = await createNotebookEntry(userId, content);
      return { entryId: entry.id };
    },
  });
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
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save entry" };
  }

  revalidatePath("/notebook");
  return { entryId };
}
