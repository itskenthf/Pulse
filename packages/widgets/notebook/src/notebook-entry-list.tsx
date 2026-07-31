import { NotebookEntry } from "./notebook-entry";
import type { NotebookEntry as NotebookEntryData } from "./types";

/** No dividers between entries — the fading opacity ramp alone is meant
 *  to read as "pages turned," without extra chrome (see the widget spec). */
export function NotebookEntryList({ entries }: { entries: NotebookEntryData[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry, index) => (
        <NotebookEntry key={entry.id} entry={entry} index={index} />
      ))}
    </div>
  );
}
