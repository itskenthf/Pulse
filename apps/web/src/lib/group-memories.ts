import { HERO_TIME_ZONE } from "@pulse/widget-hero";
import type { Memory } from "@pulse/database";

export interface MemoryGroup {
  label: string;
  memories: Memory[];
}

/** Sortable YYYY-MM-DD in HERO_TIME_ZONE — same reference-timezone
 *  pattern Hero/GitHub already use for "today", so Today/Yesterday match
 *  real calendar days instead of raw elapsed hours (which could show an
 *  entry from earlier today as "Yesterday" near local midnight, or vice
 *  versa). */
function dateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HERO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Buckets into Today / Yesterday / Last Week / older-by-month, matching
 * the Timeline mockup. Today/Yesterday compare calendar dates in
 * HERO_TIME_ZONE; the coarser Last Week/month buckets stay elapsed-time
 * based — an off-by-one there is far less noticeable than misclassifying
 * something as "Yesterday" that actually happened earlier today.
 */
export function groupMemoriesByRecency(memories: Memory[], now = new Date()): MemoryGroup[] {
  const groups: MemoryGroup[] = [];
  const todayStr = dateString(now);
  const yesterdayStr = dateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

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
    const createdStr = dateString(createdAt);
    const daysAgo = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    if (createdStr === todayStr) {
      addTo("Today", memory);
    } else if (createdStr === yesterdayStr) {
      addTo("Yesterday", memory);
    } else if (daysAgo <= 7) {
      addTo("Last Week", memory);
    } else {
      const label = new Intl.DateTimeFormat("en-US", {
        timeZone: HERO_TIME_ZONE,
        month: "long",
        year: "numeric",
      }).format(createdAt);
      addTo(label, memory);
    }
  }

  return groups;
}
