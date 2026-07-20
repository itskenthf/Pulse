import { ActionForm, WidgetCard } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { WeatherIcon } from "./icon";
import { SettingsFormFields } from "./settings-form-fields";
import type { WeatherData, WeatherSettings } from "./types";

export function WeatherComponent({
  data,
  settings,
  actions,
}: WidgetRenderProps<WeatherData, WeatherSettings>) {
  return (
    <WidgetCard
      title="Weather"
      icon={<WeatherIcon />}
      action={<ActionForm action={actions.refresh} submitLabel="Refresh" />}
    >
      {data ? (
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            {Math.round(data.temperatureC)}°C
          </p>
          <p>
            {data.description} · {data.location}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Wind {Math.round(data.windSpeedKmh)} km/h
          </p>
        </div>
      ) : (
        <p>No data yet — click refresh to fetch current conditions.</p>
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
