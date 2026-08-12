import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, refreshWidget, revalidatePath } = vi.hoisted(() => ({
  auth: vi.fn(),
  refreshWidget: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/refresh-widget", () => ({ refreshWidget }));
vi.mock("next/cache", () => ({ revalidatePath }));

const { runWidgetWriteAction } = await import("./run-widget-write-action");

function baseConfig(
  write: (
    userId: string,
    formData: FormData,
  ) => Promise<({ error?: string; refreshData?: unknown } & Record<string, unknown>) | void>,
) {
  return {
    widgetId: "tasks",
    revalidatePaths: ["/", "/tasks"],
    errorMessage: "Failed to write",
    write,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runWidgetWriteAction", () => {
  it("returns an error and never calls write when not signed in", async () => {
    auth.mockResolvedValueOnce(null);
    const write = vi.fn();

    const result = await runWidgetWriteAction(new FormData(), baseConfig(write));

    expect(result).toEqual({ error: "Not signed in" });
    expect(write).not.toHaveBeenCalled();
  });

  it("short-circuits on a validation error from write without calling refreshWidget or revalidating", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const write = vi.fn().mockResolvedValueOnce({ error: "Title can't be empty" });

    const result = await runWidgetWriteAction(new FormData(), baseConfig(write));

    expect(result).toEqual({ error: "Title can't be empty" });
    expect(refreshWidget).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refreshes the widget and revalidates every configured path on success", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    refreshWidget.mockResolvedValueOnce(undefined);
    const write = vi.fn().mockResolvedValueOnce(undefined);

    const result = await runWidgetWriteAction(new FormData(), baseConfig(write));

    expect(write).toHaveBeenCalledWith("user-1", expect.any(FormData));
    expect(refreshWidget).toHaveBeenCalledWith("tasks", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/tasks");
    expect(result).toEqual({});
  });

  it("merges extra fields write returns (e.g. an entryId) into the final state on success", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    refreshWidget.mockResolvedValueOnce(undefined);
    const write = vi.fn().mockResolvedValueOnce({ entryId: "entry-1" });

    const result = await runWidgetWriteAction(new FormData(), baseConfig(write));

    expect(result).toEqual({ entryId: "entry-1" });
  });

  it("surfaces a thrown write error using its own message, and skips revalidation", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const write = vi.fn().mockRejectedValueOnce(new Error("could not find the table"));

    const result = await runWidgetWriteAction(new FormData(), baseConfig(write));

    expect(result).toEqual({ error: "could not find the table" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes a write's refreshData through to refreshWidget as knownData, and strips it from the returned state", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    refreshWidget.mockResolvedValueOnce(undefined);
    const write = vi.fn().mockResolvedValueOnce({ refreshData: { today: { breakfast: true } } });

    const result = await runWidgetWriteAction(new FormData(), baseConfig(write));

    expect(refreshWidget).toHaveBeenCalledWith("tasks", "user-1", {
      knownData: { today: { breakfast: true } },
    });
    expect(result).toEqual({});
  });

  it("falls back to the configured errorMessage when refreshWidget throws a non-Error rejection", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    refreshWidget.mockRejectedValueOnce("a raw string rejection");
    const write = vi.fn().mockResolvedValueOnce(undefined);

    const result = await runWidgetWriteAction(new FormData(), baseConfig(write));

    expect(result).toEqual({ error: "Failed to write" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
