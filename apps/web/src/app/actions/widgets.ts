"use server";

import { revalidatePath } from "next/cache";
import { getWidget } from "@pulse/sdk";
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
