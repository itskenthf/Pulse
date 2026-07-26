import { EmptyState, RADIUS, WidgetCard, WidgetMenu } from "@pulse/ui";
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
        <EmptyState
          message="Connect your Spotify account to see your top tracks."
          action={
            <a
              href="/api/connect/spotify"
              className="inline-flex min-h-11 items-center justify-center rounded-[4px] border border-[var(--color-accent)] px-4 font-heading text-xs font-semibold text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]"
            >
              Connect Spotify
            </a>
          }
        />
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="Spotify"
      icon={<SpotifyIcon />}
      action={<WidgetMenu id="spotify" actions={actions} />}
    >
      {data.tracks.length > 0 ? (
        <ul className="flex min-w-0 flex-col gap-4">
          {data.tracks.map((track) => (
            <li key={track.id} className="flex min-w-0 items-center gap-3">
              {track.imageUrl ? (
                // Plain <img>: external Spotify CDN artwork, tiny fixed
                // size — not worth routing through next/image's optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.imageUrl}
                  alt=""
                  width={40}
                  height={40}
                  className={`h-10 w-10 shrink-0 ${RADIUS.chip} object-cover shadow-sm`}
                />
              ) : (
                <span
                  className={`h-10 w-10 shrink-0 ${RADIUS.chip} border border-[var(--color-accent-300)] bg-[var(--color-accent-100)]`}
                />
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={track.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium text-[var(--foreground)] hover:underline"
                >
                  {track.name}
                </a>
                <span className="block truncate text-xs text-[var(--color-neutral-500)]">
                  {track.artist}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="No top tracks yet." />
      )}
    </WidgetCard>
  );
}
