import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  insert,
  insertSelect,
  single,
  updateEq2,
  updateEq1,
  update,
  order,
  limit,
  resolveQuery,
  eq,
  select,
  from,
} = vi.hoisted(() => {
  // `order(...)` is awaitable on its own (the unbounded "view all" path)
  // and also chainable via `.limit(...)` (the capped card-preview path) —
  // both resolve through the same underlying mock, matching how
  // Supabase's real query builder is thenable at any point in the chain.
  const resolveQuery = vi.fn();
  const limit = vi.fn(() => resolveQuery());
  const order = vi.fn(() => ({
    limit,
    then: (onFulfilled: (value: unknown) => unknown, onRejected: (reason: unknown) => unknown) =>
      resolveQuery().then(onFulfilled, onRejected),
  }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const single = vi.fn();
  const insertSelect = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select: insertSelect }));
  const updateEq2 = vi.fn();
  const updateEq1 = vi.fn(() => ({ eq: updateEq2 }));
  const update = vi.fn(() => ({ eq: updateEq1 }));
  const from = vi.fn(() => ({ select, insert, update }));
  return {
    insert,
    insertSelect,
    single,
    updateEq2,
    updateEq1,
    update,
    order,
    limit,
    resolveQuery,
    eq,
    select,
    from,
  };
});

vi.mock("./client", () => ({
  createServiceClient: () => ({ from }),
}));

const { listNotebookEntries, createNotebookEntry, updateNotebookEntry } = await import("./notebook");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listNotebookEntries", () => {
  it("returns entries mapped from snake_case rows, newest first, capped to the limit", async () => {
    resolveQuery.mockResolvedValueOnce({
      data: [
        {
          id: "e1",
          content: "Thinking about the Notebook widget.",
          created_at: "2026-07-31T00:00:00Z",
          updated_at: "2026-07-31T00:00:00Z",
        },
      ],
      error: null,
    });

    const result = await listNotebookEntries("user-1", 10);

    expect(from).toHaveBeenCalledWith("notebook_entries");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(10);
    expect(result).toEqual([
      {
        id: "e1",
        content: "Thinking about the Notebook widget.",
        createdAt: "2026-07-31T00:00:00Z",
        updatedAt: "2026-07-31T00:00:00Z",
      },
    ]);
  });

  it("returns the full unbounded history when no limit is given", async () => {
    resolveQuery.mockResolvedValueOnce({
      data: [
        {
          id: "e1",
          content: "First",
          created_at: "2026-07-31T00:00:00Z",
          updated_at: "2026-07-31T00:00:00Z",
        },
        {
          id: "e2",
          content: "Second",
          created_at: "2026-07-30T00:00:00Z",
          updated_at: "2026-07-30T00:00:00Z",
        },
      ],
      error: null,
    });

    const result = await listNotebookEntries("user-1");

    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it("throws when the query fails", async () => {
    resolveQuery.mockResolvedValueOnce({ data: null, error: { message: "connection refused" } });

    await expect(listNotebookEntries("user-1", 10)).rejects.toThrow("connection refused");
  });
});

describe("createNotebookEntry", () => {
  it("inserts an entry and returns the created row", async () => {
    single.mockResolvedValueOnce({
      data: {
        id: "e1",
        content: "A fresh thought",
        created_at: "2026-07-31T00:00:00Z",
        updated_at: "2026-07-31T00:00:00Z",
      },
      error: null,
    });

    const result = await createNotebookEntry("user-1", "A fresh thought");

    expect(from).toHaveBeenCalledWith("notebook_entries");
    expect(insert).toHaveBeenCalledWith({ user_id: "user-1", content: "A fresh thought" });
    expect(result).toEqual({
      id: "e1",
      content: "A fresh thought",
      createdAt: "2026-07-31T00:00:00Z",
      updatedAt: "2026-07-31T00:00:00Z",
    });
  });

  it("clamps content to the 2000-character ceiling", async () => {
    single.mockResolvedValueOnce({
      data: {
        id: "e1",
        content: "a".repeat(2000),
        created_at: "2026-07-31T00:00:00Z",
        updated_at: "2026-07-31T00:00:00Z",
      },
      error: null,
    });

    await createNotebookEntry("user-1", "a".repeat(2500));

    expect(insert).toHaveBeenCalledWith({ user_id: "user-1", content: "a".repeat(2000) });
  });

  it("throws when the insert fails", async () => {
    single.mockResolvedValueOnce({ data: null, error: { message: "disk full" } });

    await expect(createNotebookEntry("user-1", "content")).rejects.toThrow("disk full");
  });
});

describe("updateNotebookEntry", () => {
  it("updates the given entry's content for the given user", async () => {
    updateEq2.mockResolvedValueOnce({ error: null });

    await updateNotebookEntry("user-1", "e1", "Updated thought");

    expect(from).toHaveBeenCalledWith("notebook_entries");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ content: "Updated thought" }));
    expect(updateEq1).toHaveBeenCalledWith("user_id", "user-1");
    expect(updateEq2).toHaveBeenCalledWith("id", "e1");
  });

  it("throws when the update fails", async () => {
    updateEq2.mockResolvedValueOnce({ error: { message: "not found" } });

    await expect(updateNotebookEntry("user-1", "e1", "content")).rejects.toThrow("not found");
  });
});
