import type { RecentlyPlayedGame } from "@pulse/adapter-steam";

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${(minutes / 60).toFixed(1).replace(/\.0$/, "")}h`;
}

/**
 * Total playtime per game, as a horizontal bar relative to the longest-played
 * game in the list — turns a column of numbers into an at-a-glance
 * comparison. Single hue (magnitude, not identity), so no legend needed.
 * Glass track + gradient glow fill, not a flat Material-style rectangle.
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
    <div className="flex items-center gap-3">
      {game.iconUrl ? (
        // Plain <img>: external Steam CDN icons, tiny fixed size — not
        // worth routing through next/image's optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={game.iconUrl}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm"
        />
      ) : (
        <span className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-sky-200 to-indigo-200 dark:from-sky-500/20 dark:to-indigo-500/20" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {game.name}
          </span>
          <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-500">
            {formatHours(game.playtime2WeeksMinutes)} recent
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/40 shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-white/50 dark:bg-white/5 dark:ring-white/10">
            <div
              className="pulse-bar-fill h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 shadow-[0_0_10px_-1px_rgba(56,189,248,0.7)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-400">
            {formatHours(game.playtimeForeverMinutes)}
          </span>
        </div>
      </div>
    </div>
  );
}
