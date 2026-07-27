"use server";

import { revalidatePath } from "next/cache";
import { cycleQuote } from "@pulse/widget-hero";
import type { WidgetActionState } from "@pulse/sdk";
import { auth } from "@/auth";

/**
 * Swaps the Hero widget's quote only (no weather re-fetch) — the click
 * handler behind the quote text itself. See cycle-quote.ts in
 * @pulse/widget-hero for why this is a separate, lighter action than
 * refreshWidgetAction.
 */
export async function cycleHeroQuoteAction(
  _prevState: WidgetActionState,
  _formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  try {
    await cycleQuote(session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to cycle quote" };
  }

  revalidatePath("/");
  return {};
}
