import { formatRelativeDayLabel, opacityForIndex } from "./format";
import type { NotebookEntry as NotebookEntryData } from "./types";

export function NotebookEntry({ entry, index }: { entry: NotebookEntryData; index: number }) {
  return (
    <div style={{ opacity: opacityForIndex(index) }} className="flex flex-col gap-1">
      <p className="text-xs text-[var(--color-neutral-500)]">
        {formatRelativeDayLabel(entry.createdAt)}
      </p>
      <p className="whitespace-pre-wrap font-body text-sm text-[var(--foreground)]">
        {entry.content}
      </p>
    </div>
  );
}
