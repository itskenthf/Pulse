import { EmptyState, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { CoverArt } from "./cover-art";
import { SteamIcon } from "./icon";
import { SettingsFormFields } from "./settings-form-fields";
import type { SteamData, SteamSettings } from "./types";

/**
 * Compact thumbnail + title — not full cover art tiles — matching
 * Spotify's glanceable row shape (see docs/DECISIONS.md). Both (still
 * capped at `MAX_GAMES`) games sit side-by-side in one row rather than
 * stacked, wrapping to a second line only if the card is too narrow.
 * Hours, last-played, and achievements stay on each game's own detail
 * page (apps/web/src/app/steam/[appId]/page.tsx), reading the same
 * cached SteamData; that page still uses `CoverArt` at full width.
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
      tag={
        data && data.games.length > 0
          ? { label: `${data.games.length} played`, variant: "neutral" }
          : undefined
      }
      action={
        <WidgetMenu
          id="steam"
          actions={actions}
          settingsFields={<SettingsFormFields settings={settings} />}
        />
      }
    >
      {data ? (
        data.games.length > 0 ? (
          <div className="flex flex-row flex-wrap gap-4">
            {data.games.map((game) => (
              <a
                key={game.appId}
                href={`/steam/${game.appId}`}
                className="group flex min-w-0 flex-1 items-center gap-2"
              >
                <div className="w-12 shrink-0">
                  <CoverArt appId={game.appId} name={game.name} />
                </div>
                <span className="truncate text-sm font-medium text-[var(--foreground)]">
                  {game.name}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState message={`No games played in the last 2 weeks — or your Steam profile's "Game details" privacy isn't set to Public.`} />
        )
      ) : (
        <EmptyState message="No data yet — set your SteamID64 in settings, then refresh." />
      )}
    </WidgetCard>
  );
}
