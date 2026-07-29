import { describe, expect, it, vi } from "vitest";

const { insert, updateEq2, updateEq1, update, deleteEq2, deleteEq1, del, order, eq, select, from } =
  vi.hoisted(() => {
    const order = vi.fn();
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const insert = vi.fn();
    const updateEq2 = vi.fn();
    const updateEq1 = vi.fn(() => ({ eq: updateEq2 }));
    const update = vi.fn(() => ({ eq: updateEq1 }));
    const deleteEq2 = vi.fn();
    const deleteEq1 = vi.fn(() => ({ eq: deleteEq2 }));
    const del = vi.fn(() => ({ eq: deleteEq1 }));
    const from = vi.fn(() => ({ select, insert, update, delete: del }));
    return { insert, updateEq2, updateEq1, update, deleteEq2, deleteEq1, del, order, eq, select, from };
  });

vi.mock("./client", () => ({
  createServiceClient: () => ({ from }),
}));

const { listNotes, createNote, updateNote, deleteNote } = await import("./notes");

describe("listNotes", () => {
  it("returns notes mapped from snake_case rows, newest first", async () => {
    order.mockResolvedValueOnce({
      data: [
        {
          id: "n1",
          title: "Redesign Spotify widget",
          body: "Move top artist to the top.",
          created_at: "2026-07-27T00:00:00Z",
          updated_at: "2026-07-27T00:00:00Z",
        },
      ],
      error: null,
    });

    const result = await listNotes("user-1");

    expect(from).toHaveBeenCalledWith("notes");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([
      {
        id: "n1",
        title: "Redesign Spotify widget",
        body: "Move top artist to the top.",
        createdAt: "2026-07-27T00:00:00Z",
        updatedAt: "2026-07-27T00:00:00Z",
      },
    ]);
  });

  it("throws when the query fails", async () => {
    order.mockResolvedValueOnce({ data: null, error: { message: "connection refused" } });

    await expect(listNotes("user-1")).rejects.toThrow("connection refused");
  });
});

describe("createNote", () => {
  it("inserts a note", async () => {
    insert.mockResolvedValueOnce({ error: null });

    await createNote("user-1", "Title", "Body");

    expect(from).toHaveBeenCalledWith("notes");
    expect(insert).toHaveBeenCalledWith({ user_id: "user-1", title: "Title", body: "Body" });
  });

  it("throws when the insert fails", async () => {
    insert.mockResolvedValueOnce({ error: { message: "disk full" } });

    await expect(createNote("user-1", "Title", "Body")).rejects.toThrow("disk full");
  });
});

describe("updateNote", () => {
  it("updates only the given fields", async () => {
    updateEq2.mockResolvedValueOnce({ error: null });

    await updateNote("user-1", "n1", { body: "New body" });

    expect(from).toHaveBeenCalledWith("notes");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ body: "New body" }));
    expect(updateEq1).toHaveBeenCalledWith("user_id", "user-1");
    expect(updateEq2).toHaveBeenCalledWith("id", "n1");
  });

  it("throws when the update fails", async () => {
    updateEq2.mockResolvedValueOnce({ error: { message: "not found" } });

    await expect(updateNote("user-1", "n1", { body: "New body" })).rejects.toThrow("not found");
  });
});

describe("deleteNote", () => {
  it("deletes the given note for the given user", async () => {
    deleteEq2.mockResolvedValueOnce({ error: null });

    await deleteNote("user-1", "n1");

    expect(from).toHaveBeenCalledWith("notes");
    expect(deleteEq1).toHaveBeenCalledWith("user_id", "user-1");
    expect(deleteEq2).toHaveBeenCalledWith("id", "n1");
  });

  it("throws when the delete fails", async () => {
    deleteEq2.mockResolvedValueOnce({ error: { message: "not found" } });

    await expect(deleteNote("user-1", "n1")).rejects.toThrow("not found");
  });
});
