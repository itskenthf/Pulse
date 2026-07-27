import { describe, expect, it, vi } from "vitest";

const { insert, limit, order, eq, select, from } = vi.hoisted(() => {
  const limit = vi.fn();
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const insert = vi.fn();
  const from = vi.fn(() => ({ select, insert }));
  return { insert, limit, order, eq, select, from };
});

vi.mock("./client", () => ({
  createServiceClient: () => ({ from }),
}));

const { writeMemories, listMemories } = await import("./memories");

describe("writeMemories", () => {
  it("does nothing when there are no events", async () => {
    await writeMemories("user-1", "github", []);

    expect(from).not.toHaveBeenCalled();
  });

  it("bulk-inserts events with defaults for missing description/metadata", async () => {
    insert.mockResolvedValueOnce({ error: null });

    await writeMemories("user-1", "github", [
      { title: "New commit in Pulse", description: "Fix build" },
      { title: "Created a new repository" },
    ]);

    expect(from).toHaveBeenCalledWith("memories");
    expect(insert).toHaveBeenCalledWith([
      {
        user_id: "user-1",
        source: "github",
        title: "New commit in Pulse",
        description: "Fix build",
        metadata: {},
      },
      {
        user_id: "user-1",
        source: "github",
        title: "Created a new repository",
        description: null,
        metadata: {},
      },
    ]);
  });

  it("throws when the write fails", async () => {
    insert.mockResolvedValueOnce({ error: { message: "disk full" } });

    await expect(writeMemories("user-1", "github", [{ title: "x" }])).rejects.toThrow(
      "disk full",
    );
  });
});

describe("listMemories", () => {
  it("returns memories ordered newest first", async () => {
    limit.mockResolvedValueOnce({
      data: [
        {
          id: "m1",
          source: "github",
          title: "New commit in Pulse",
          description: null,
          metadata: {},
          created_at: "2026-07-27T00:00:00Z",
        },
      ],
      error: null,
    });

    const result = await listMemories("user-1");

    expect(from).toHaveBeenCalledWith("memories");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(200);
    expect(result).toEqual([
      {
        id: "m1",
        source: "github",
        title: "New commit in Pulse",
        description: null,
        metadata: {},
        createdAt: "2026-07-27T00:00:00Z",
      },
    ]);
  });

  it("throws when the query fails", async () => {
    limit.mockResolvedValueOnce({ data: null, error: { message: "connection refused" } });

    await expect(listMemories("user-1")).rejects.toThrow("connection refused");
  });
});
