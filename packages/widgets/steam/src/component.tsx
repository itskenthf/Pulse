import { WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { CoverArt } from "./cover-art";
import { SteamIcon } from "./icon";
import { SettingsFormFields } from "./settings-form-fields";
import type { SteamData, SteamSettings } from "./types";

/**
 * Cover art + title only — hours, last-played, and achievements moved to
 * each game's own detail page (apps/web/src/app/steam/[appId]/page.tsx),
 * reading the same cached SteamData. Keeps the card matching a
 * game-library shelf instead of a stats table.
 */
export function SteamComponent({
  data,
  settings,
  actions,
}: WidgetRenderProps<SteamData, SteamSettings>) {
  return (
    <WidgetCard
      title="Steam"
      icon={<SteamIcon />}
      action={
        <WidgetMenu
          id="steam"
          actions={actions}
          settingsFields={<SettingsFormFields settings={settings} />}
        />
      }
      accent="indigo"
    >
      {data ? (
        data.games.length > 0 ? (
          <div className="flex flex-col gap-3">
            {data.games.map((game) => (
              <a
                key={game.appId}
                href={`/steam/${game.appId}`}
                className="group flex flex-col gap-2 rounded-2xl"
              >
                <CoverArt appId={game.appId} name={game.name} />
                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {game.name}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p>
            No games played in the last 2 weeks — or your Steam profile&apos;s
            &quot;Game details&quot; privacy isn&apos;t set to Public.
          </p>
        )
      ) : (
        <p>No data yet — set your SteamID64 in settings, then refresh.</p>
      )}
    </WidgetCard>
  );
}
