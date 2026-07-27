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

const { listTasks, createTask, setTaskCompleted, deleteTask } = await import("./tasks");

describe("listTasks", () => {
  it("returns tasks mapped from snake_case rows, newest first", async () => {
    order.mockResolvedValueOnce({
      data: [
        {
          id: "t1",
          title: "Write plan",
          completed: false,
          due_at: null,
          created_at: "2026-07-27T00:00:00Z",
          updated_at: "2026-07-27T00:00:00Z",
        },
      ],
      error: null,
    });

    const result = await listTasks("user-1");

    expect(from).toHaveBeenCalledWith("tasks");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([
      {
        id: "t1",
        title: "Write plan",
        completed: false,
        dueAt: null,
        createdAt: "2026-07-27T00:00:00Z",
        updatedAt: "2026-07-27T00:00:00Z",
      },
    ]);
  });

  it("throws when the query fails", async () => {
    order.mockResolvedValueOnce({ data: null, error: { message: "connection refused" } });

    await expect(listTasks("user-1")).rejects.toThrow("connection refused");
  });
});

describe("createTask", () => {
  it("inserts a task with a null due date by default", async () => {
    insert.mockResolvedValueOnce({ error: null });

    await createTask("user-1", "Write plan");

    expect(from).toHaveBeenCalledWith("tasks");
    expect(insert).toHaveBeenCalledWith({ user_id: "user-1", title: "Write plan", due_at: null });
  });

  it("throws when the insert fails", async () => {
    insert.mockResolvedValueOnce({ error: { message: "disk full" } });

    await expect(createTask("user-1", "Write plan")).rejects.toThrow("disk full");
  });
});

describe("setTaskCompleted", () => {
  it("updates the completed flag for the given task", async () => {
    updateEq2.mockResolvedValueOnce({ error: null });

    await setTaskCompleted("user-1", "t1", true);

    expect(from).toHaveBeenCalledWith("tasks");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ completed: true }));
    expect(updateEq1).toHaveBeenCalledWith("user_id", "user-1");
    expect(updateEq2).toHaveBeenCalledWith("id", "t1");
  });

  it("throws when the update fails", async () => {
    updateEq2.mockResolvedValueOnce({ error: { message: "not found" } });

    await expect(setTaskCompleted("user-1", "t1", true)).rejects.toThrow("not found");
  });
});

describe("deleteTask", () => {
  it("deletes the given task for the given user", async () => {
    deleteEq2.mockResolvedValueOnce({ error: null });

    await deleteTask("user-1", "t1");

    expect(from).toHaveBeenCalledWith("tasks");
    expect(deleteEq1).toHaveBeenCalledWith("user_id", "user-1");
    expect(deleteEq2).toHaveBeenCalledWith("id", "t1");
  });

  it("throws when the delete fails", async () => {
    deleteEq2.mockResolvedValueOnce({ error: { message: "not found" } });

    await expect(deleteTask("user-1", "t1")).rejects.toThrow("not found");
  });
});
