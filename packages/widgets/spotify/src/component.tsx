import { ActionForm, WidgetCard } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { SpotifyIcon } from "./icon";
import type { SpotifyData } from "./types";

export function SpotifyComponent({
  data,
  actions,
}: WidgetRenderProps<SpotifyData, Record<string, unknown>>) {
  if (!data || !data.connected) {
    return (
      <WidgetCard title="Spotify" icon={<SpotifyIcon />}>
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
      action={<ActionForm action={actions.refresh} submitLabel="Refresh" />}
    >
      {data.tracks.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {data.tracks.map((track) => (
            <li key={track.id} className="flex items-center gap-2">
              {track.imageUrl ? (
                // Plain <img>: external Spotify CDN artwork, tiny fixed
                // size — not worth routing through next/image's optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.imageUrl} alt="" width={20} height={20} className="rounded-sm" />
              ) : (
                <span className="h-5 w-5 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
              )}
              <a
                href={track.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-zinc-950 hover:underline dark:text-zinc-50"
              >
                {track.name}
              </a>
              <span className="shrink-0 truncate text-xs text-zinc-500 dark:text-zinc-500">
                {track.artist}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No top tracks yet.</p>
      )}
    </WidgetCard>
  );
}
