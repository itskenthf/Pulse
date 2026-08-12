"use server";

import { revalidatePath } from "next/cache";
import { getAllWidgets, getWidget } from "@pulse/sdk";
import type { WidgetActionState } from "@pulse/sdk";
import { ensureWidgetRegistered, writeWidgetSettings } from "@pulse/database";
import { auth } from "@/auth";
import { refreshWidget } from "@/lib/refresh-widget";
import { revalidateWidgetTag, widgetSettingsTag } from "@/lib/widget-data-cache";
import "@/lib/register-widgets";

export async function refreshWidgetAction(
  widgetId: string,
  _prevState: WidgetActionState,
  _formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  try {
    // No { force: false } here, unlike refreshAllWidgetsAction below — a
    // direct, single-widget "Refresh" click should always get real,
    // current data regardless of the widget's own refreshInterval.
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
 * a per-widget click for every card — and also from the automatic
 * tab-focus/visibility refresh (`refresh-all-title.tsx`), pull-to-refresh,
 * and the "r" keyboard shortcut, all sharing this one action.
 *
 * `force: false`, same as cron: a widget whose cache is still younger
 * than its own `refreshInterval` is skipped rather than re-fetched. This
 * action fires far more often than cron (every auto-triggered tab focus,
 * every pull-to-refresh), so without this a Steam/RSS widget with a long
 * refreshInterval would get hit far harder than it needs — see
 * docs/DECISIONS.md's 2026-08-12 entry. An individual widget's own
 * "Refresh" button (refreshWidgetAction below) still always forces a real
 * refresh, since that's a direct, single-widget request.
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
    widgets.map((widget) => refreshWidget(widget.id, userId, { force: false })),
  );

  // Name the widgets that actually failed, and why — "1 of 4 failed" alone
  // gives nothing to act on, which is what made a silently-broken GitHub
  // query hard to place when this first shipped.
  const failed = widgets
    .map((widget, index) => ({ widget, result: results[index] }))
    .filter(
      (entry): entry is { widget: (typeof widgets)[number]; result: PromiseRejectedResult } =>
        entry.result?.status === "rejected",
    )
    .map(({ widget, result }) => {
      const reason = result.reason instanceof Error ? result.reason.message : "Unknown error";
      return `${widget.name}: ${reason}`;
    });

  revalidatePath("/");
  if (failed.length > 0) {
    return { error: failed.join("\n") };
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
    // Narrow invalidation for the settings read itself — refreshWidget
    // below already revalidates the cache-data tag centrally (see its own
    // comment in refresh-widget.ts).
    revalidateWidgetTag(widgetSettingsTag(session.user.id, widgetId));
    // Settings changed — refresh immediately so the new location shows up
    // without waiting for the next scheduled run.
    await refreshWidget(widgetId, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save settings" };
  }

  revalidatePath("/");
  return {};
}
