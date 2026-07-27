"use server";

import { cycleQuote } from "@pulse/widget-hero";
import type { WidgetActionState } from "@pulse/sdk";
import { auth } from "@/auth";

/**
 * Swaps the Hero widget's quote only (no weather re-fetch) — the click
 * handler behind the quote text itself. See cycle-quote.ts in
 * @pulse/widget-hero for why this is a separate, lighter action than
 * refreshWidgetAction.
 *
 * Deliberately doesn't call `revalidatePath("/")`: that would re-render
 * the whole dashboard and re-read every other widget's cache from
 * Supabase just to show one new quote, which is what made clicking feel
 * like a multi-second refresh rather than an instant swap. The new quote
 * is written to the cache (so cron/full refreshes stay in sync) and
 * returned directly in the action state instead — `QuoteButton` renders
 * it straight from `useActionState`, no page-wide re-render needed.
 */
export async function cycleHeroQuoteAction(
  _prevState: WidgetActionState,
  _formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  try {
    const data = await cycleQuote(session.user.id);
    return { quote: data.quote };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to cycle quote" };
  }
}
