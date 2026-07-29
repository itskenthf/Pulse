import type { MemoryEvent } from "@pulse/sdk";
import type { TaskData } from "./types";

/**
 * Only completions are memory-worthy, not additions — matches how
 * GitHub/Steam only log meaningful state changes, not every write. See
 * the doc comment on `Widget.deriveMemories` in @pulse/sdk for why this
 * diffs against the previous snapshot rather than firing on every fetch.
 */
export function deriveTaskMemories(previous: TaskData | null, next: TaskData): MemoryEvent[] {
  const previousCompleted = new Set(
    (previous?.tasks ?? []).filter((task) => task.completed).map((task) => task.id),
  );

  return next.tasks
    .filter((task) => task.completed && !previousCompleted.has(task.id))
    .map((task) => ({ title: `Completed ${task.title}` }));
}
