import type { MemoryEvent } from "@pulse/sdk";
import type { NotebookData } from "./types";

const SNIPPET_LENGTH = 80;

function snippet(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= SNIPPET_LENGTH) return trimmed;
  return `${trimmed.slice(0, SNIPPET_LENGTH)}…`;
}

/**
 * Only a newly-created entry is memory-worthy — the autosave updates that
 * happen while its "draft" box is still open aren't logged individually,
 * to avoid noise on every debounce tick. Same diff-against-previous-
 * snapshot pattern as Notes' `deriveNoteMemories`; see the doc comment on
 * `Widget.deriveMemories` in @pulse/sdk for why.
 */
export function deriveNotebookMemories(
  previous: NotebookData | null,
  next: NotebookData,
): MemoryEvent[] {
  const previousIds = new Set((previous?.entries ?? []).map((entry) => entry.id));

  return next.entries
    .filter((entry) => !previousIds.has(entry.id))
    .map((entry) => ({ title: `Wrote in Notebook: ${snippet(entry.content)}` }));
}
