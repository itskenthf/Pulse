import type { Memory } from "@pulse/database";

export interface MemoryGroup {
  label: string;
  memories: Memory[];
}

/**
 * Buckets into Today / Yesterday / Last Week / older-by-month, matching
 * the Timeline mockup. Day boundaries are elapsed-time-based (same
 * tradeoff `formatRelativeDay` already makes in the GitHub widget), not
 * calendar/timezone-aware — good enough for a single-user app, not worth
 * a cross-package timezone dependency for this milestone.
 */
export function groupMemoriesByRecency(memories: Memory[], now = new Date()): MemoryGroup[] {
  const groups: MemoryGroup[] = [];

  function addTo(label: string, memory: Memory) {
    const existing = groups.find((group) => group.label === label);
    if (existing) {
      existing.memories.push(memory);
    } else {
      groups.push({ label, memories: [memory] });
    }
  }

  for (const memory of memories) {
    const createdAt = new Date(memory.createdAt);
    const daysAgo = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysAgo <= 0) {
      addTo("Today", memory);
    } else if (daysAgo === 1) {
      addTo("Yesterday", memory);
    } else if (daysAgo <= 7) {
      addTo("Last Week", memory);
    } else {
      const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        createdAt,
      );
      addTo(label, memory);
    }
  }

  return groups;
}
