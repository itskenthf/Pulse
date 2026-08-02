import { formatEntryTimestamp, opacityForIndex } from "./format";
import type { NotebookEntry as NotebookEntryData } from "./types";

export function NotebookEntry({ entry, index }: { entry: NotebookEntryData; index: number }) {
  return (
    <div style={{ opacity: opacityForIndex(index) }} className="flex flex-row items-start gap-3">
      <p className="w-20 shrink-0 text-[11px] leading-snug text-[var(--color-neutral-400)]">
        {formatEntryTimestamp(entry)}
      </p>
      <p className="whitespace-pre-wrap font-body text-sm text-[var(--foreground)]">
        {entry.content}
      </p>
    </div>
  );
}
