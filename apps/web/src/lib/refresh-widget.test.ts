import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getWidget,
  readWidgetCache,
  readWidgetCacheUpdatedAt,
  writeWidgetCache,
  writeMemories,
  revalidateWidgetTag,
} = vi.hoisted(() => ({
  getWidget: vi.fn(),
  readWidgetCache: vi.fn(),
  readWidgetCacheUpdatedAt: vi.fn(),
  writeWidgetCache: vi.fn(),
  writeMemories: vi.fn(),
  revalidateWidgetTag: vi.fn(),
}));

vi.mock("@pulse/sdk", () => ({ getWidget }));
vi.mock("@pulse/database", () => ({
  readWidgetCache,
  readWidgetCacheUpdatedAt,
  writeWidgetCache,
  writeMemories,
}));
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
    const deriveMemories = vi.fn().mockReturnValueOnce([]);
    getWidget.mockReturnValueOnce({ id: "tasks", dataSchema: undefined, fetchData, deriveMemories });
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

  it("treats a previous cache read that fails schema validation as no previous data, rather than failing the refresh", async () => {
    const deriveMemories = vi.fn().mockReturnValueOnce([]);
    const fetchData = vi.fn().mockResolvedValueOnce({ tasks: [] });
    getWidget.mockReturnValueOnce({ id: "tasks", fetchData, deriveMemories });
    readWidgetCache.mockRejectedValueOnce(
      new Error('Cached data for widget "tasks" no longer matches its expected shape: ...'),
    );
    writeWidgetCache.mockResolvedValueOnce(undefined);

    await expect(refreshWidget("tasks", "user-1")).resolves.toBeUndefined();

    expect(deriveMemories).toHaveBeenCalledWith(null, { tasks: [] });
    // The whole point: a stale/incompatible previous row must not stop the
    // fresh, schema-compliant data from being written — otherwise nothing
    // could ever replace the incompatible row and the widget stays broken
    // forever, not just until the next refresh.
    expect(writeWidgetCache).toHaveBeenCalledWith(
      "user-1",
      "tasks",
      { tasks: [] },
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
  });

  it("propagates a failing fetchData instead of writing a cache row for it", async () => {
    const fetchData = vi.fn().mockRejectedValueOnce(new Error("GitHub API rate limited"));
    getWidget.mockReturnValueOnce({ id: "github", fetchData });
    readWidgetCache.mockResolvedValueOnce(null);

    await expect(refreshWidget("github", "user-1")).rejects.toThrow("GitHub API rate limited");
    expect(writeWidgetCache).not.toHaveBeenCalled();
  });

  it("never reads the previous cache for a widget with no deriveMemories — it would only be discarded", async () => {
    const fetchData = vi.fn().mockResolvedValueOnce({ tracks: [] });
    getWidget.mockReturnValueOnce({ id: "hero", fetchData });
    writeWidgetCache.mockResolvedValueOnce(undefined);

    await refreshWidget("hero", "user-1");

    expect(readWidgetCache).not.toHaveBeenCalled();
    expect(writeWidgetCache).toHaveBeenCalled();
  });

  describe("force: false", () => {
    it("skips fetchData/write entirely when the cache is younger than the widget's refreshInterval", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-12T12:00:00Z"));
      const fetchData = vi.fn();
      getWidget.mockReturnValueOnce({ id: "steam", refreshInterval: 10_800, fetchData });
      readWidgetCacheUpdatedAt.mockResolvedValueOnce("2026-08-12T11:00:00Z"); // 1h old, interval is 3h

      await refreshWidget("steam", "user-1", { force: false });

      expect(fetchData).not.toHaveBeenCalled();
      expect(writeWidgetCache).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("proceeds when the cache is older than the widget's refreshInterval", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-12T12:00:00Z"));
      const fetchData = vi.fn().mockResolvedValueOnce({ games: [] });
      getWidget.mockReturnValueOnce({ id: "steam", refreshInterval: 10_800, fetchData });
      readWidgetCacheUpdatedAt.mockResolvedValueOnce("2026-08-12T08:00:00Z"); // 4h old, interval is 3h
      writeWidgetCache.mockResolvedValueOnce(undefined);

      await refreshWidget("steam", "user-1", { force: false });

      expect(fetchData).toHaveBeenCalled();
      expect(writeWidgetCache).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("proceeds when there is no previous cache row at all (first-ever refresh)", async () => {
      const fetchData = vi.fn().mockResolvedValueOnce({ games: [] });
      getWidget.mockReturnValueOnce({ id: "steam", refreshInterval: 10_800, fetchData });
      readWidgetCacheUpdatedAt.mockResolvedValueOnce(null);
      writeWidgetCache.mockResolvedValueOnce(undefined);

      await refreshWidget("steam", "user-1", { force: false });

      expect(fetchData).toHaveBeenCalled();
    });

    it("never checks freshness at all when force is left at its true default", async () => {
      const fetchData = vi.fn().mockResolvedValueOnce({ games: [] });
      getWidget.mockReturnValueOnce({ id: "steam", refreshInterval: 10_800, fetchData });
      writeWidgetCache.mockResolvedValueOnce(undefined);

      await refreshWidget("steam", "user-1");

      expect(readWidgetCacheUpdatedAt).not.toHaveBeenCalled();
      expect(fetchData).toHaveBeenCalled();
    });
  });
});
