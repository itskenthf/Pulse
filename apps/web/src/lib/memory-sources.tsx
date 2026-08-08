import { Book, CheckSquare, NotebookPen } from "lucide-react";
import type { ReactNode } from "react";
import { GitHubIcon, WIDGET_ID as GITHUB_WIDGET_ID } from "@pulse/widget-github";
import { NOTEBOOK_WIDGET_ID } from "@pulse/widget-notebook";
import { NOTES_WIDGET_ID } from "@pulse/widget-notes";
import { SpotifyIcon, WIDGET_ID as SPOTIFY_WIDGET_ID } from "@pulse/widget-spotify";
import { SteamIcon, WIDGET_ID as STEAM_WIDGET_ID } from "@pulse/widget-steam";
import { TASKS_WIDGET_ID } from "@pulse/widget-tasks";

interface SourceMeta {
  label: string;
  icon: ReactNode;
}

/** Each widget's own icon, sized to fill whatever fixed-size wrapper the
 *  caller puts it in (Timeline's per-entry badge) regardless of the
 *  icon component's own hardcoded width/height — GitHub/Steam/Spotify's
 *  icons don't take a size prop, so `h-full w-full` on the lucide icons
 *  and a wrapper wrapping all three keeps them visually consistent. */
export const MEMORY_SOURCE_META: Record<string, SourceMeta> = {
  [GITHUB_WIDGET_ID]: { label: "GitHub", icon: <GitHubIcon /> },
  [STEAM_WIDGET_ID]: { label: "Steam", icon: <SteamIcon /> },
  [SPOTIFY_WIDGET_ID]: { label: "Spotify", icon: <SpotifyIcon /> },
  [NOTEBOOK_WIDGET_ID]: {
    label: "Notebook",
    icon: <NotebookPen className="h-full w-full" aria-hidden="true" />,
  },
  [NOTES_WIDGET_ID]: { label: "Notes", icon: <Book className="h-full w-full" aria-hidden="true" /> },
  [TASKS_WIDGET_ID]: {
    label: "Tasks",
    icon: <CheckSquare className="h-full w-full" aria-hidden="true" />,
  },
};

/**
 * Where clicking a memory entry should go, if anywhere. A specific
 * detail page when the event's own metadata identifies one item (a
 * GitHub PR's URL, a Steam game's appId — see each widget's
 * deriveMemories), otherwise the source's own list page. `null` means
 * the entry isn't clickable — Spotify has no dedicated page to link to.
 */
export function memoryHref(source: string, metadata: Record<string, unknown>): string | null {
  if (source === GITHUB_WIDGET_ID && typeof metadata.url === "string") {
    return metadata.url;
  }
  if (source === STEAM_WIDGET_ID && typeof metadata.appId === "number") {
    return `/steam/${metadata.appId}`;
  }
  if (source === NOTEBOOK_WIDGET_ID) return "/notebook";
  if (source === NOTES_WIDGET_ID) return "/notes";
  if (source === TASKS_WIDGET_ID) return "/tasks";
  return null;
}

export function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}
