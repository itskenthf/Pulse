import { ActionForm, WidgetCard } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { GreetingIcon } from "./icon";
import { SettingsFormFields } from "./settings-form-fields";
import type { GreetingData, GreetingSettings } from "./types";

export function GreetingComponent({
  data,
  settings,
  actions,
}: WidgetRenderProps<GreetingData, GreetingSettings>) {
  return (
    <WidgetCard
      title="Greeting"
      icon={<GreetingIcon />}
      action={<ActionForm action={actions.refresh} submitLabel="Refresh" />}
      tone="accent"
    >
      {data ? (
        <p className="text-lg font-medium text-current">{data.message}</p>
      ) : (
        <p>No greeting yet — click refresh.</p>
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
