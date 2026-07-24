import type { RecentlyPlayedGame } from "@pulse/adapter-steam";

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${(minutes / 60).toFixed(1).replace(/\.0$/, "")}h`;
}

/**
 * Total playtime per game, as a horizontal bar relative to the longest-played
 * game in the list — turns a column of numbers into an at-a-glance
 * comparison. Single hue (magnitude, not identity), so no legend needed.
 */
export function PlaytimeBar({
  game,
  maxMinutes,
}: {
  game: RecentlyPlayedGame;
  maxMinutes: number;
}) {
  const pct =
    maxMinutes > 0 ? Math.max(4, Math.round((game.playtimeForeverMinutes / maxMinutes) * 100)) : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {game.iconUrl ? (
          // Plain <img>: external Steam CDN icons, tiny fixed size — not
          // worth routing through next/image's optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.iconUrl} alt="" width={20} height={20} className="rounded-sm" />
        ) : (
          <span className="h-5 w-5 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-950 dark:text-zinc-50">
          {game.name}
        </span>
        <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-500">
          {formatHours(game.playtime2WeeksMinutes)} recent
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950/50">
          <div
            className="h-2 rounded-r-full bg-sky-500 dark:bg-sky-400"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
          {formatHours(game.playtimeForeverMinutes)}
        </span>
      </div>
    </div>
  );
}
