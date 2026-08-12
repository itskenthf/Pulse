import type { Metadata } from "next";
import { Clock, Trophy } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { readWidgetCache } from "@pulse/database";
import { glassClass, Metric, RADIUS } from "@pulse/ui";
import {
  CoverArt,
  formatHours,
  formatRelativeDay,
  steamDataSchema,
  WIDGET_ID,
  type SteamData,
} from "@pulse/widget-steam";
import { auth } from "@/auth";

/**
 * `cache()`-wrapped so `generateMetadata` and the page component below
 * can both ask for this game without the widget_cache row actually being
 * read twice per request — React dedupes calls with the same arguments
 * within one render pass.
 */
const getGame = cache(async (userId: string, appId: string) => {
  const cached = await readWidgetCache<SteamData>(userId, WIDGET_ID, steamDataSchema);
  return cached?.data.games.find((g) => String(g.appId) === appId) ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ appId: string }>;
}): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) return {};

  const { appId } = await params;
  const game = await getGame(session.user.id, appId);
  return { title: game?.name ?? "Game" };
}

export default async function SteamGamePage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const game = await getGame(session.user.id, appId);
  if (!game) {
    notFound();
  }

  const achievementPct = game.achievements
    ? Math.round((game.achievements.unlocked / Math.max(1, game.achievements.total)) * 100)
    : null;

  return (
    <div className={`flex flex-col gap-6 ${RADIUS.card} p-6 ${glassClass("light")}`}>
      <CoverArt appId={game.appId} name={game.name} coverArtUrl={game.coverArtUrl} />

      <div className="flex flex-1 flex-col gap-5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          {game.name}
        </h1>

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <Metric label="Total playtime" value={formatHours(game.playtimeForeverMinutes)} />
          <Metric label="Last 2 weeks" value={formatHours(game.playtime2WeeksMinutes)} />
          {game.lastPlayedAt !== undefined && (
            <Metric label="Last played" value={formatRelativeDay(game.lastPlayedAt)} />
          )}
        </div>

        {game.achievements && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              Achievements — {game.achievements.unlocked}/{game.achievements.total} (
              {achievementPct}%)
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full border border-[var(--color-divider)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${achievementPct}%` }}
              />
            </div>
            {game.achievements.nextAchievementName && (
              <p className="text-sm text-[var(--color-neutral-600)]">
                Next: {game.achievements.nextAchievementName}
              </p>
            )}
          </div>
        )}

        {!game.achievements && (
          <p className="flex items-center gap-2 text-sm text-[var(--color-neutral-500)]">
            <Clock className="h-4 w-4" aria-hidden="true" />
            No achievement data available for this game.
          </p>
        )}
      </div>
    </div>
  );
}
