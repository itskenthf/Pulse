import { ActionForm, WidgetCard } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { ClockDisplay } from "./clock-display";
import { ClockIcon } from "./icon";
import { SettingsFormFields } from "./settings-form-fields";
import type { ClockData, ClockSettings } from "./types";

export function ClockComponent({
  settings,
  actions,
}: WidgetRenderProps<ClockData, ClockSettings>) {
  return (
    <WidgetCard
      title="Clock"
      icon={<ClockIcon />}
      action={<ActionForm action={actions.refresh} submitLabel="Refresh" />}
      tone="accent"
    >
      <ClockDisplay settings={settings} />
      <p className="text-xs opacity-60">{settings.timeZone}</p>

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
