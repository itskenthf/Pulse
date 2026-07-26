"use server";

import { revalidatePath } from "next/cache";
import { getAllWidgets, getWidget } from "@pulse/sdk";
import type { WidgetActionState } from "@pulse/sdk";
import { ensureWidgetRegistered, writeWidgetSettings } from "@pulse/database";
import { auth } from "@/auth";
import { refreshWidget } from "@/lib/refresh-widget";
import "@/lib/register-widgets";

export async function refreshWidgetAction(
  widgetId: string,
  _prevState: WidgetActionState,
  _formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  try {
    await refreshWidget(widgetId, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Refresh failed" };
  }

  revalidatePath("/");
  return {};
}

/**
 * Refreshes every registered widget for the signed-in user in parallel,
 * mirroring the cron route's Promise.allSettled pattern (apps/web/src/app/
 * api/cron/route.ts) — one slow/failing widget shouldn't block the rest
 * from refreshing. Triggered from the "Pulse" title itself (single-user
 * app, per Ken's request — no separate icon needed) rather than requiring
 * a per-widget click for every card.
 */
export async function refreshAllWidgetsAction(
  _prevState: WidgetActionState,
  _formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };
  const userId = session.user.id;

  const widgets = getAllWidgets();
  const results = await Promise.allSettled(
    widgets.map((widget) => refreshWidget(widget.id, userId)),
  );
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  revalidatePath("/");
  if (failures.length > 0) {
    return { error: `${failures.length} of ${widgets.length} widgets failed to refresh` };
  }
  return {};
}

export async function updateWidgetSettingsAction(
  widgetId: string,
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const widget = getWidget(widgetId);
  if (!widget?.parseSettingsForm) {
    return { error: `Widget "${widgetId}" has no settings` };
  }

  let settings: unknown;
  try {
    settings = widget.parseSettingsForm(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid settings" };
  }

  try {
    // widget_settings has a foreign key to widget_registry — a widget whose
    // first-ever interaction is a settings save (rather than a fetch, which
    // registers it) would otherwise fail the constraint.
    await ensureWidgetRegistered(widget.id, widget.name);
    await writeWidgetSettings(session.user.id, widgetId, settings);
    // Settings changed — refresh immediately so the new location shows up
    // without waiting for the next scheduled run.
    await refreshWidget(widgetId, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save settings" };
  }

  revalidatePath("/");
  return {};
}
