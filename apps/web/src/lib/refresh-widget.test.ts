import { beforeEach, describe, expect, it, vi } from "vitest";

const { getWidget, readWidgetCache, writeWidgetCache, writeMemories, revalidateWidgetTag } =
  vi.hoisted(() => ({
    getWidget: vi.fn(),
    readWidgetCache: vi.fn(),
    writeWidgetCache: vi.fn(),
    writeMemories: vi.fn(),
    revalidateWidgetTag: vi.fn(),
  }));

vi.mock("@pulse/sdk", () => ({ getWidget }));
vi.mock("@pulse/database", () => ({ readWidgetCache, writeWidgetCache, writeMemories }));
vi.mock("./widget-data-cache", () => ({
  revalidateWidgetTag,
  widgetCacheTag: (userId: string, widgetId: string) => `widget-cache:${userId}:${widgetId}`,
}));
// Side-effect-only import (registers every real widget) — irrelevant to
// this test, which fully controls getWidget's return value.
vi.mock("./register-widgets", () => ({}));

const { refreshWidget } = await import("./refresh-widget");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("refreshWidget", () => {
  it("throws for an unregistered widget id without touching the database", async () => {
    getWidget.mockReturnValueOnce(undefined);

    await expect(refreshWidget("not-a-widget", "user-1")).rejects.toThrow(
      'Unknown widget "not-a-widget"',
    );
    expect(readWidgetCache).not.toHaveBeenCalled();
  });

  it("reads the previous cache and fetches new data concurrently, then writes the cache with a readAsOf guard", async () => {
    const fetchData = vi.fn().mockResolvedValueOnce({ tasks: ["new"] });
    getWidget.mockReturnValueOnce({ id: "tasks", dataSchema: undefined, fetchData });
    readWidgetCache.mockResolvedValueOnce({ data: { tasks: [] }, updatedAt: "2026-07-01T00:00:00Z" });
    writeWidgetCache.mockResolvedValueOnce(undefined);

    await refreshWidget("tasks", "user-1");

    expect(readWidgetCache).toHaveBeenCalledWith("user-1", "tasks", undefined);
    expect(fetchData).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", signal: expect.any(AbortSignal) }),
    );

    // readAsOf (the 4th arg) is captured before either the read or the
    // fetch — the actual fix for the disappearing-task race — so it must
    // be a valid ISO timestamp, not undefined or the fetch's own result.
    expect(writeWidgetCache).toHaveBeenCalledWith(
      "user-1",
      "tasks",
      { tasks: ["new"] },
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );

    // Narrow, per-(user, widget) invalidation — not a page-wide revalidatePath
    // — is what lets other widgets' dashboard reads keep serving from cache
    // instead of re-hitting Supabase after this one widget's refresh.
    expect(revalidateWidgetTag).toHaveBeenCalledWith("widget-cache:user-1:tasks");
  });

  it("derives and writes memories from the previous/new data pair", async () => {
    const deriveMemories = vi.fn().mockReturnValueOnce([{ type: "new-task" }]);
    const fetchData = vi.fn().mockResolvedValueOnce({ tasks: ["new"] });
    getWidget.mockReturnValueOnce({ id: "tasks", fetchData, deriveMemories });
    readWidgetCache.mockResolvedValueOnce({ data: { tasks: [] }, updatedAt: "2026-07-01T00:00:00Z" });
    writeWidgetCache.mockResolvedValueOnce(undefined);
    writeMemories.mockResolvedValueOnce(undefined);

    await refreshWidget("tasks", "user-1");

    expect(deriveMemories).toHaveBeenCalledWith({ tasks: [] }, { tasks: ["new"] });
    expect(writeMemories).toHaveBeenCalledWith("user-1", "tasks", [{ type: "new-task" }]);
  });

  it("passes null as the previous data when there is no prior cache (first-ever fetch)", async () => {
    const deriveMemories = vi.fn().mockReturnValueOnce([]);
    const fetchData = vi.fn().mockResolvedValueOnce({ tasks: [] });
    getWidget.mockReturnValueOnce({ id: "tasks", fetchData, deriveMemories });
    readWidgetCache.mockResolvedValueOnce(null);
    writeWidgetCache.mockResolvedValueOnce(undefined);

    await refreshWidget("tasks", "user-1");

    expect(deriveMemories).toHaveBeenCalledWith(null, { tasks: [] });
  });

  it("skips writeMemories entirely when there are no events, and when the widget has no deriveMemories at all", async () => {
    const fetchData = vi.fn().mockResolvedValueOnce({ tasks: [] });
    getWidget.mockReturnValueOnce({ id: "tasks", fetchData });
    readWidgetCache.mockResolvedValueOnce(null);
    writeWidgetCache.mockResolvedValueOnce(undefined);

    await refreshWidget("tasks", "user-1");

    expect(writeMemories).not.toHaveBeenCalled();
  });

  it("never lets a failing memory write fail the refresh itself — the cache write must already have succeeded", async () => {
    const deriveMemories = vi.fn().mockReturnValueOnce([{ type: "new-task" }]);
    const fetchData = vi.fn().mockResolvedValueOnce({ tasks: ["new"] });
    getWidget.mockReturnValueOnce({ id: "tasks", fetchData, deriveMemories });
    readWidgetCache.mockResolvedValueOnce(null);
    writeWidgetCache.mockResolvedValueOnce(undefined);
    writeMemories.mockRejectedValueOnce(new Error("relation \"memories\" does not exist"));

    await expect(refreshWidget("tasks", "user-1")).resolves.toBeUndefined();
    expect(writeWidgetCache).toHaveBeenCalled();
  });

  it("propagates a failing fetchData instead of writing a cache row for it", async () => {
    const fetchData = vi.fn().mockRejectedValueOnce(new Error("GitHub API rate limited"));
    getWidget.mockReturnValueOnce({ id: "github", fetchData });
    readWidgetCache.mockResolvedValueOnce(null);

    await expect(refreshWidget("github", "user-1")).rejects.toThrow("GitHub API rate limited");
    expect(writeWidgetCache).not.toHaveBeenCalled();
  });
});
