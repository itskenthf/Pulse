import { describe, expect, it } from "vitest";
import { taskDataSchema } from "./types";

const validData = {
  tasks: [
    {
      id: "t1",
      title: "Write plan",
      completed: false,
      dueAt: null,
      createdAt: "2026-07-27T00:00:00Z",
      updatedAt: "2026-07-27T00:00:00Z",
    },
  ],
  fetchedAt: "2026-07-27T00:00:00Z",
};

describe("taskDataSchema", () => {
  it("accepts a well-formed cache row", () => {
    expect(taskDataSchema.safeParse(validData).success).toBe(true);
  });

  it("accepts an empty tasks list", () => {
    expect(taskDataSchema.safeParse({ tasks: [], fetchedAt: validData.fetchedAt }).success).toBe(
      true,
    );
  });

  it("rejects a row missing a required field", () => {
    const { fetchedAt: _fetchedAt, ...withoutFetchedAt } = validData;
    expect(taskDataSchema.safeParse(withoutFetchedAt).success).toBe(false);
  });

  it("rejects a task where a field's type has drifted", () => {
    const result = taskDataSchema.safeParse({
      ...validData,
      tasks: [{ ...validData.tasks[0], completed: "false" }],
    });
    expect(result.success).toBe(false);
  });
});
