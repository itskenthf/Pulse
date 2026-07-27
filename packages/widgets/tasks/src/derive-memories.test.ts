import { describe, expect, it } from "vitest";
import { deriveTaskMemories } from "./derive-memories";
import type { Task, TaskData } from "./types";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Write plan",
    completed: false,
    dueAt: null,
    createdAt: "2026-07-27T00:00:00Z",
    updatedAt: "2026-07-27T00:00:00Z",
    ...overrides,
  };
}

function data(tasks: Task[]): TaskData {
  return { tasks, fetchedAt: "2026-07-27T00:00:00Z" };
}

describe("deriveTaskMemories", () => {
  it("returns nothing when there are no tasks", () => {
    expect(deriveTaskMemories(null, data([]))).toEqual([]);
  });

  it("does not emit a memory for a newly-added incomplete task", () => {
    expect(deriveTaskMemories(null, data([task({ completed: false })]))).toEqual([]);
  });

  it("emits a memory when a task flips from incomplete to complete", () => {
    const previous = data([task({ id: "t1", completed: false })]);
    const next = data([task({ id: "t1", completed: true })]);

    expect(deriveTaskMemories(previous, next)).toEqual([{ title: "Completed Write plan" }]);
  });

  it("does not emit a memory when a task is already complete", () => {
    const snapshot = data([task({ id: "t1", completed: true })]);

    expect(deriveTaskMemories(snapshot, snapshot)).toEqual([]);
  });

  it("does not emit a memory for a task that was deleted", () => {
    const previous = data([task({ id: "t1", completed: true })]);
    const next = data([]);

    expect(deriveTaskMemories(previous, next)).toEqual([]);
  });
});
