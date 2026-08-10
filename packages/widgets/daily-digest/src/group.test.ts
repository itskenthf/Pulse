import { describe, expect, it } from "vitest";
import { groupTodaysMemories, type MemoryLike } from "./group";

const TODAY = "2026-08-09";

function memory(source: string, title: string, dateStr: string = TODAY): MemoryLike {
  return { source, title, dateStr };
}

describe("groupTodaysMemories", () => {
  it("returns an empty list when nothing happened today", () => {
    expect(groupTodaysMemories([], TODAY)).toEqual([]);
  });

  it("excludes memories from other days", () => {
    const memories = [memory("GitHub", "Opened PR #1", "2026-08-08")];
    expect(groupTodaysMemories(memories, TODAY)).toEqual([]);
  });

  it("groups by the already-resolved source label", () => {
    const memories = [memory("GitHub", "Opened PR #42"), memory("GitHub", "Merged PR #40")];
    expect(groupTodaysMemories(memories, TODAY)).toEqual([
      { source: "GitHub", count: 2, titles: ["Opened PR #42", "Merged PR #40"] },
    ]);
  });

  it("sorts busiest source first", () => {
    const memories = [
      memory("Steam", "Played Palworld"),
      memory("GitHub", "Opened PR #1"),
      memory("GitHub", "Opened PR #2"),
      memory("GitHub", "Merged PR #1"),
    ];
    const result = groupTodaysMemories(memories, TODAY);
    expect(result.map((entry) => entry.source)).toEqual(["GitHub", "Steam"]);
  });

  it("caps preview titles but keeps the real count", () => {
    const memories = [
      memory("Tasks", "Completed A"),
      memory("Tasks", "Completed B"),
      memory("Tasks", "Completed C"),
      memory("Tasks", "Completed D"),
    ];
    const result = groupTodaysMemories(memories, TODAY);
    expect(result[0]).toEqual({
      source: "Tasks",
      count: 4,
      titles: ["Completed A", "Completed B", "Completed C"],
    });
  });

  it("breaks ties alphabetically for a stable order", () => {
    const memories = [memory("Steam", "Played Palworld"), memory("GitHub", "Opened PR #1")];
    const result = groupTodaysMemories(memories, TODAY);
    expect(result.map((entry) => entry.source)).toEqual(["GitHub", "Steam"]);
  });
});
