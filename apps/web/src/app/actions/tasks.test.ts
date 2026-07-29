import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, createTask, deleteTask, setTaskCompleted, refreshWidget, revalidatePath } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    createTask: vi.fn(),
    deleteTask: vi.fn(),
    setTaskCompleted: vi.fn(),
    refreshWidget: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@pulse/database", () => ({ createTask, deleteTask, setTaskCompleted }));
vi.mock("@/lib/refresh-widget", () => ({ refreshWidget }));
vi.mock("next/cache", () => ({ revalidatePath }));

const { addTaskAction, toggleTaskAction, deleteTaskAction } = await import("./tasks");

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addTaskAction", () => {
  it("returns an error and does nothing else when not signed in", async () => {
    auth.mockResolvedValueOnce(null);

    const result = await addTaskAction({}, formData({ title: "Buy milk" }));

    expect(result).toEqual({ error: "Not signed in" });
    expect(createTask).not.toHaveBeenCalled();
  });

  it("rejects an empty/whitespace-only title without touching the database", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await addTaskAction({}, formData({ title: "   " }));

    expect(result).toEqual({ error: "Task title can't be empty" });
    expect(createTask).not.toHaveBeenCalled();
  });

  it("creates the task, refreshes the widget, and revalidates both pages on success", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    createTask.mockResolvedValueOnce(undefined);
    refreshWidget.mockResolvedValueOnce(undefined);

    const result = await addTaskAction({}, formData({ title: "Buy milk" }));

    expect(createTask).toHaveBeenCalledWith("user-1", "Buy milk");
    expect(refreshWidget).toHaveBeenCalledWith("tasks", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/tasks");
    expect(result).toEqual({});
  });

  it("surfaces the underlying error message instead of silently failing when the write throws", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    createTask.mockRejectedValueOnce(new Error("connection refused"));

    const result = await addTaskAction({}, formData({ title: "Buy milk" }));

    expect(result).toEqual({ error: "connection refused" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("toggleTaskAction", () => {
  it("returns an error for a malformed form submission", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await toggleTaskAction({}, formData({ taskId: "task-1" }));

    expect(result).toEqual({ error: "Invalid task update" });
    expect(setTaskCompleted).not.toHaveBeenCalled();
  });

  it("parses the completed flag from its string form value", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    setTaskCompleted.mockResolvedValueOnce(undefined);
    refreshWidget.mockResolvedValueOnce(undefined);

    await toggleTaskAction({}, formData({ taskId: "task-1", completed: "true" }));

    expect(setTaskCompleted).toHaveBeenCalledWith("user-1", "task-1", true);
  });
});

describe("deleteTaskAction", () => {
  it("deletes the task and refreshes the widget on success", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    deleteTask.mockResolvedValueOnce(undefined);
    refreshWidget.mockResolvedValueOnce(undefined);

    const result = await deleteTaskAction({}, formData({ taskId: "task-1" }));

    expect(deleteTask).toHaveBeenCalledWith("user-1", "task-1");
    expect(refreshWidget).toHaveBeenCalledWith("tasks", "user-1");
    expect(result).toEqual({});
  });
});
