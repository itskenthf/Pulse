import type { MemoryEvent } from "@pulse/sdk";
import type { NoteData } from "./types";

/**
 * Only creation is memory-worthy — editing an existing note's body isn't
 * logged, to avoid noise on every small edit. See the doc comment on
 * `Widget.deriveMemories` in @pulse/sdk for why this diffs against the
 * previous snapshot rather than firing on every fetch.
 */
export function deriveNoteMemories(previous: NoteData | null, next: NoteData): MemoryEvent[] {
  const previousIds = new Set((previous?.notes ?? []).map((note) => note.id));

  return next.notes
    .filter((note) => !previousIds.has(note.id))
    .map((note) => ({ title: `Created a note: ${note.title}` }));
}
