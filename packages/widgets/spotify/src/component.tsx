import { WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { SpotifyIcon } from "./icon";
import type { SpotifyData } from "./types";

export function SpotifyComponent({
  data,
  actions,
}: WidgetRenderProps<SpotifyData, Record<string, unknown>>) {
  if (!data || !data.connected) {
    return (
      <WidgetCard title="Spotify" icon={<SpotifyIcon />} accent="green">
        <a
          href="/api/connect/spotify"
          className="inline-block rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Connect Spotify
        </a>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="Spotify"
      icon={<SpotifyIcon />}
      action={<WidgetMenu id="spotify" actions={actions} />}
      accent="green"
    >
      {data.tracks.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {data.tracks.map((track) => (
            <li key={track.id} className="flex items-center gap-3">
              {track.imageUrl ? (
                // Plain <img>: external Spotify CDN artwork, tiny fixed
                // size — not worth routing through next/image's optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.imageUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm"
                />
              ) : (
                <span className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-200 to-teal-200 dark:from-emerald-500/20 dark:to-teal-500/20" />
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={track.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {track.name}
                </a>
                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-500">
                  {track.artist}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No top tracks yet.</p>
      )}
    </WidgetCard>
  );
}
