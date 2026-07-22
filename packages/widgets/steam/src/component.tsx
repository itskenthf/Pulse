import { ActionForm, WidgetCard } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { SteamIcon } from "./icon";
import { SettingsFormFields } from "./settings-form-fields";
import type { SteamData, SteamSettings } from "./types";

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${(minutes / 60).toFixed(1).replace(/\.0$/, "")}h`;
}

export function SteamComponent({
  data,
  settings,
  actions,
}: WidgetRenderProps<SteamData, SteamSettings>) {
  return (
    <WidgetCard
      title="Steam"
      icon={<SteamIcon />}
      action={<ActionForm action={actions.refresh} submitLabel="Refresh" />}
    >
      {data ? (
        data.games.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.games.map((game) => (
              <li key={game.appId} className="flex items-center gap-2">
                {game.iconUrl ? (
                  // Plain <img>: external Steam CDN icons, tiny fixed size —
                  // not worth routing through next/image's optimizer.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={game.iconUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="rounded-sm"
                  />
                ) : (
                  <span className="h-5 w-5 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                )}
                <span className="min-w-0 flex-1 truncate text-zinc-950 dark:text-zinc-50">
                  {game.name}
                </span>
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-500">
                  {formatHours(game.playtime2WeeksMinutes)} ·{" "}
                  {formatHours(game.playtimeForeverMinutes)} total
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No games played in the last 2 weeks — or your Steam profile&apos;s
            &quot;Game details&quot; privacy isn&apos;t set to Public.
          </p>
        )
      ) : (
        <p>No data yet — set your SteamID64 in settings, then refresh.</p>
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
