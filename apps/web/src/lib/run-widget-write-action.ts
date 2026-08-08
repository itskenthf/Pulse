import { revalidatePath } from "next/cache";
import type { WidgetActionState } from "@pulse/sdk";
import { auth } from "@/auth";
import { refreshWidget } from "@/lib/refresh-widget";

export interface RunWidgetWriteActionConfig {
  widgetId: string;
  /** Paths to revalidate on success — always includes "/", plus whatever
   *  full-history page (e.g. "/tasks") also needs to reflect the change. */
  revalidatePaths: string[];
  /** Fallback message when a thrown error isn't an `Error` instance. */
  errorMessage: string;
  /**
   * Validate `formData` and perform the DB write. Return `{ error }` to
   * short-circuit before `refreshWidget`/revalidation run (a validation
   * failure, not a write) — same shape the action itself would return.
   * Anything else (including `void`) is treated as success; a returned
   * object's fields (e.g. notebook's `{ entryId }`) are merged into the
   * final `WidgetActionState`.
   */
  write: (userId: string, formData: FormData) => Promise<WidgetActionState | void>;
}

/**
 * The auth-check → write → refreshWidget → revalidate shape every one of
 * notes.ts's/tasks.ts's/notebook.ts's write actions repeated by hand
 * (ARCHITECTURE_AUDIT.md's CD1 finding — the code was even self-aware of
 * it, with comments like "same shape as actions/tasks.ts" pointing at each
 * other instead of a shared implementation). This is that shape once,
 * with each action supplying only what's actually specific to it: its
 * widget id, which paths to revalidate, and its own form parsing + DB call.
 *
 * Deliberately NOT used by notebook's `updateEntryAction` or hero's
 * `cycleHeroQuoteAction` — both intentionally skip `refreshWidget`/
 * `revalidatePath("/")` for their own documented performance reasons (see
 * each file's own comment), which this helper always does.
 */
export async function runWidgetWriteAction(
  formData: FormData,
  config: RunWidgetWriteActionConfig,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  let result: WidgetActionState | void;
  try {
    result = await config.write(session.user.id, formData);
    if (result?.error) return result;
    await refreshWidget(config.widgetId, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : config.errorMessage };
  }

  for (const path of config.revalidatePaths) revalidatePath(path);
  return result ?? {};
}
