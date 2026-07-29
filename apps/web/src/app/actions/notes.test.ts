import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, createNote, updateNote, deleteNote, refreshWidget, revalidatePath } = vi.hoisted(
  () => ({
    auth: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    refreshWidget: vi.fn(),
    revalidatePath: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({ auth }));
vi.mock("@pulse/database", () => ({ createNote, updateNote, deleteNote }));
vi.mock("@/lib/refresh-widget", () => ({ refreshWidget }));
vi.mock("next/cache", () => ({ revalidatePath }));

const { addNoteAction, updateNoteAction, deleteNoteAction } = await import("./notes");

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addNoteAction", () => {
  it("returns an error and does nothing else when not signed in", async () => {
    auth.mockResolvedValueOnce(null);

    const result = await addNoteAction({}, formData({ title: "Idea" }));

    expect(result).toEqual({ error: "Not signed in" });
    expect(createNote).not.toHaveBeenCalled();
  });

  it("rejects an empty/whitespace-only title", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await addNoteAction({}, formData({ title: "   " }));

    expect(result).toEqual({ error: "Note title can't be empty" });
    expect(createNote).not.toHaveBeenCalled();
  });

  it("defaults body to an empty string when the form omits it", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    createNote.mockResolvedValueOnce(undefined);
    refreshWidget.mockResolvedValueOnce(undefined);

    await addNoteAction({}, formData({ title: "Idea" }));

    expect(createNote).toHaveBeenCalledWith("user-1", "Idea", "");
  });

  it("creates the note, refreshes the widget, and revalidates both pages on success", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    createNote.mockResolvedValueOnce(undefined);
    refreshWidget.mockResolvedValueOnce(undefined);

    const result = await addNoteAction({}, formData({ title: "Idea", body: "Details" }));

    expect(createNote).toHaveBeenCalledWith("user-1", "Idea", "Details");
    expect(refreshWidget).toHaveBeenCalledWith("notes", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/notes");
    expect(result).toEqual({});
  });

  it("surfaces the underlying error message and skips revalidation when the write throws", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    createNote.mockRejectedValueOnce(new Error("could not find the table"));

    const result = await addNoteAction({}, formData({ title: "Idea" }));

    expect(result).toEqual({ error: "could not find the table" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateNoteAction", () => {
  it("returns an error for a malformed form submission", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await updateNoteAction({}, formData({ title: "New title" }));

    expect(result).toEqual({ error: "Invalid note" });
    expect(updateNote).not.toHaveBeenCalled();
  });

  it("passes only the fields present in the form through as undefined otherwise", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    updateNote.mockResolvedValueOnce(undefined);
    refreshWidget.mockResolvedValueOnce(undefined);

    await updateNoteAction({}, formData({ noteId: "note-1", title: "New title" }));

    expect(updateNote).toHaveBeenCalledWith("user-1", "note-1", {
      title: "New title",
      body: undefined,
    });
  });
});

describe("deleteNoteAction", () => {
  it("deletes the note and refreshes the widget on success", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    deleteNote.mockResolvedValueOnce(undefined);
    refreshWidget.mockResolvedValueOnce(undefined);

    const result = await deleteNoteAction({}, formData({ noteId: "note-1" }));

    expect(deleteNote).toHaveBeenCalledWith("user-1", "note-1");
    expect(refreshWidget).toHaveBeenCalledWith("notes", "user-1");
    expect(result).toEqual({});
  });

  it("returns an error for a malformed form submission", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await deleteNoteAction({}, formData({}));

    expect(result).toEqual({ error: "Invalid note" });
    expect(deleteNote).not.toHaveBeenCalled();
  });
});
