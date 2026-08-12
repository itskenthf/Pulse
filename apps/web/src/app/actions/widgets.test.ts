import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  auth,
  getAllWidgets,
  getWidget,
  ensureWidgetRegistered,
  writeWidgetSettings,
  refreshWidget,
  revalidatePath,
  revalidateWidgetTag,
} = vi.hoisted(() => ({
  auth: vi.fn(),
  getAllWidgets: vi.fn(),
  getWidget: vi.fn(),
  ensureWidgetRegistered: vi.fn(),
  writeWidgetSettings: vi.fn(),
  refreshWidget: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateWidgetTag: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@pulse/sdk", () => ({ getAllWidgets, getWidget }));
vi.mock("@pulse/database", () => ({ ensureWidgetRegistered, writeWidgetSettings }));
vi.mock("@/lib/refresh-widget", () => ({ refreshWidget }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/widget-data-cache", () => ({
  revalidateWidgetTag,
  widgetSettingsTag: (userId: string, widgetId: string) => `widget-settings:${userId}:${widgetId}`,
}));
vi.mock("@/lib/register-widgets", () => ({}));

const { refreshWidgetAction, refreshAllWidgetsAction, updateWidgetSettingsAction } =
  await import("./widgets");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("refreshWidgetAction", () => {
  it("returns an error when not signed in", async () => {
    auth.mockResolvedValueOnce(null);

    const result = await refreshWidgetAction("github", {}, new FormData());

    expect(result).toEqual({ error: "Not signed in" });
    expect(refreshWidget).not.toHaveBeenCalled();
  });

  it("refreshes the given widget and revalidates on success", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    refreshWidget.mockResolvedValueOnce(undefined);

    const result = await refreshWidgetAction("github", {}, new FormData());

    expect(refreshWidget).toHaveBeenCalledWith("github", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(result).toEqual({});
  });

  it("surfaces the failure message instead of throwing", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    refreshWidget.mockRejectedValueOnce(new Error("GitHub API rate limited"));

    const result = await refreshWidgetAction("github", {}, new FormData());

    expect(result).toEqual({ error: "GitHub API rate limited" });
  });
});

describe("refreshAllWidgetsAction", () => {
  it("returns an error when not signed in, before touching any widget", async () => {
    auth.mockResolvedValueOnce(null);

    const result = await refreshAllWidgetsAction({}, new FormData());

    expect(result).toEqual({ error: "Not signed in" });
    expect(getAllWidgets).not.toHaveBeenCalled();
  });

  it("refreshes every widget and reports success when all succeed", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    getAllWidgets.mockReturnValueOnce([
      { id: "github", name: "GitHub" },
      { id: "notes", name: "Notes" },
    ]);
    refreshWidget.mockResolvedValue(undefined);

    const result = await refreshAllWidgetsAction({}, new FormData());

    expect(refreshWidget).toHaveBeenCalledWith("github", "user-1", { force: false });
    expect(refreshWidget).toHaveBeenCalledWith("notes", "user-1", { force: false });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(result).toEqual({});
  });

  it("names each failed widget and its own reason — 'N of M failed' alone gives nothing to act on", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    getAllWidgets.mockReturnValueOnce([
      { id: "github", name: "GitHub" },
      { id: "notes", name: "Notes" },
      { id: "steam", name: "Steam" },
    ]);
    refreshWidget.mockImplementation(async (widgetId: string) => {
      if (widgetId === "notes") throw new Error("Could not find the table 'public.notes'");
      if (widgetId === "steam") throw new Error("Steam API timed out");
    });

    const result = await refreshAllWidgetsAction({}, new FormData());

    expect(result.error).toContain("Notes: Could not find the table 'public.notes'");
    expect(result.error).toContain("Steam: Steam API timed out");
    expect(result.error).not.toContain("GitHub");
  });

  it("still refreshes and revalidates even when every widget fails, rather than throwing", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    getAllWidgets.mockReturnValueOnce([{ id: "github", name: "GitHub" }]);
    refreshWidget.mockRejectedValueOnce(new Error("network error"));

    const result = await refreshAllWidgetsAction({}, new FormData());

    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(result).toEqual({ error: "GitHub: network error" });
  });

  it("falls back to 'Unknown error' when a rejection reason isn't an Error instance", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    getAllWidgets.mockReturnValueOnce([{ id: "github", name: "GitHub" }]);
    refreshWidget.mockRejectedValueOnce("a raw string rejection");

    const result = await refreshAllWidgetsAction({}, new FormData());

    expect(result).toEqual({ error: "GitHub: Unknown error" });
  });

  it("one widget failing doesn't block the others from refreshing (Promise.allSettled, not allSettled-then-abort)", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    getAllWidgets.mockReturnValueOnce([
      { id: "github", name: "GitHub" },
      { id: "notes", name: "Notes" },
    ]);
    refreshWidget.mockImplementation(async (widgetId: string) => {
      if (widgetId === "github") throw new Error("rate limited");
    });

    await refreshAllWidgetsAction({}, new FormData());

    expect(refreshWidget).toHaveBeenCalledWith("notes", "user-1", { force: false });
  });
});

describe("updateWidgetSettingsAction", () => {
  it("returns an error when not signed in", async () => {
    auth.mockResolvedValueOnce(null);

    const result = await updateWidgetSettingsAction("spotify", {}, new FormData());

    expect(result).toEqual({ error: "Not signed in" });
  });

  it("returns an error when the widget has no settings support", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    getWidget.mockReturnValueOnce({ id: "spotify", name: "Spotify" });

    const result = await updateWidgetSettingsAction("spotify", {}, new FormData());

    expect(result).toEqual({ error: 'Widget "spotify" has no settings' });
  });

  it("surfaces a settings-parse error without writing anything", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const parseSettingsForm = vi.fn(() => {
      throw new Error("Invalid location");
    });
    getWidget.mockReturnValueOnce({ id: "spotify", name: "Spotify", parseSettingsForm });

    const result = await updateWidgetSettingsAction("spotify", {}, new FormData());

    expect(result).toEqual({ error: "Invalid location" });
    expect(writeWidgetSettings).not.toHaveBeenCalled();
  });

  it("registers the widget, writes settings, refreshes, and revalidates on success", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const parseSettingsForm = vi.fn(() => ({ location: "Kuching" }));
    getWidget.mockReturnValueOnce({ id: "spotify", name: "Spotify", parseSettingsForm });
    ensureWidgetRegistered.mockResolvedValueOnce(undefined);
    writeWidgetSettings.mockResolvedValueOnce(undefined);
    refreshWidget.mockResolvedValueOnce(undefined);

    const result = await updateWidgetSettingsAction("spotify", {}, new FormData());

    expect(ensureWidgetRegistered).toHaveBeenCalledWith("spotify", "Spotify");
    expect(writeWidgetSettings).toHaveBeenCalledWith("user-1", "spotify", { location: "Kuching" });
    expect(refreshWidget).toHaveBeenCalledWith("spotify", "user-1");
    expect(revalidateWidgetTag).toHaveBeenCalledWith("widget-settings:user-1:spotify");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(result).toEqual({});
  });
});
