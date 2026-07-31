import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, createNotebookEntry, updateNotebookEntry, refreshWidget, revalidatePath } = vi.hoisted(
  () => ({
    auth: vi.fn(),
    createNotebookEntry: vi.fn(),
    updateNotebookEntry: vi.fn(),
    refreshWidget: vi.fn(),
    revalidatePath: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({ auth }));
vi.mock("@pulse/database", () => ({ createNotebookEntry, updateNotebookEntry }));
vi.mock("@/lib/refresh-widget", () => ({ refreshWidget }));
vi.mock("next/cache", () => ({ revalidatePath }));

const { addEntryAction, updateEntryAction } = await import("./notebook");

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addEntryAction", () => {
  it("returns an error and does nothing else when not signed in", async () => {
    auth.mockResolvedValueOnce(null);

    const result = await addEntryAction({}, formData({ content: "A thought" }));

    expect(result).toEqual({ error: "Not signed in" });
    expect(createNotebookEntry).not.toHaveBeenCalled();
  });

  it("rejects an empty/whitespace-only entry", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await addEntryAction({}, formData({ content: "   " }));

    expect(result).toEqual({ error: "Entry can't be empty" });
    expect(createNotebookEntry).not.toHaveBeenCalled();
  });

  it("creates the entry, refreshes the widget, revalidates, and returns the new entry's id", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    createNotebookEntry.mockResolvedValueOnce({
      id: "entry-1",
      content: "A thought",
      createdAt: "2026-07-31T00:00:00Z",
      updatedAt: "2026-07-31T00:00:00Z",
    });
    refreshWidget.mockResolvedValueOnce(undefined);

    const result = await addEntryAction({}, formData({ content: "A thought" }));

    expect(createNotebookEntry).toHaveBeenCalledWith("user-1", "A thought");
    expect(refreshWidget).toHaveBeenCalledWith("notebook", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/notebook");
    expect(result).toEqual({ entryId: "entry-1" });
  });

  it("surfaces the underlying error message and skips revalidation when the write throws", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    createNotebookEntry.mockRejectedValueOnce(new Error("could not find the table"));

    const result = await addEntryAction({}, formData({ content: "A thought" }));

    expect(result).toEqual({ error: "could not find the table" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateEntryAction", () => {
  it("returns an error for a malformed form submission", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await updateEntryAction({}, formData({ content: "New content" }));

    expect(result).toEqual({ error: "Invalid entry" });
    expect(updateNotebookEntry).not.toHaveBeenCalled();
  });

  it("updates the entry, skips the full-dashboard refresh, and echoes back the entry id", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    updateNotebookEntry.mockResolvedValueOnce(undefined);

    const result = await updateEntryAction({}, formData({ entryId: "entry-1", content: "Updated" }));

    expect(updateNotebookEntry).toHaveBeenCalledWith("user-1", "entry-1", "Updated");
    // Deliberately does NOT call refreshWidget or revalidatePath("/") — an
    // update fires on every autosave pause while composing, and doing a
    // full dashboard refresh on each one made the whole page feel laggy.
    // See actions/notebook.ts's doc comment.
    expect(refreshWidget).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/notebook");
    expect(result).toEqual({ entryId: "entry-1" });
  });

  it("surfaces the underlying error message when the write throws", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    updateNotebookEntry.mockRejectedValueOnce(new Error("not found"));

    const result = await updateEntryAction({}, formData({ entryId: "entry-1", content: "Updated" }));

    expect(result).toEqual({ error: "not found" });
  });
});
