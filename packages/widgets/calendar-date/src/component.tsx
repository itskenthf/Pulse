import { ActionForm, WidgetCard } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { CalendarIcon } from "./icon";
import { SettingsFormFields } from "./settings-form-fields";
import type { CalendarDateData, CalendarDateSettings } from "./types";

export function CalendarDateComponent({
  data,
  settings,
  actions,
}: WidgetRenderProps<CalendarDateData, CalendarDateSettings>) {
  return (
    <WidgetCard
      title="Calendar"
      icon={<CalendarIcon />}
      action={<ActionForm action={actions.refresh} submitLabel="Refresh" />}
    >
      {data ? (
        <p className="text-lg font-medium text-zinc-950 dark:text-zinc-50">{data.formatted}</p>
      ) : (
        <p>No data yet — click refresh.</p>
      )}

      {actions.updateSettings && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-zinc-500 dark:text-zinc-500">
            Settings
          </summary>
          <ActionForm action={actions.updateSettings} submitLabel="Save" className="mt-2">
            <SettingsFormFields settings={settings} />
          </ActionForm>
        </details>
      )}
    </WidgetCard>
  );
}
