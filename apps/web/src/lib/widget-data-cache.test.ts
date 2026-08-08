import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@pulse/database", () => ({ readWidgetCache: vi.fn(), readWidgetSettings: vi.fn() }));

const { widgetCacheTag, widgetSettingsTag } = await import("./widget-data-cache");

describe("widgetCacheTag", () => {
  it("scopes the tag by both user and widget", () => {
    expect(widgetCacheTag("user-1", "github")).toBe("widget-cache:user-1:github");
    expect(widgetCacheTag("user-2", "github")).not.toBe(widgetCacheTag("user-1", "github"));
    expect(widgetCacheTag("user-1", "steam")).not.toBe(widgetCacheTag("user-1", "github"));
  });
});

describe("widgetSettingsTag", () => {
  it("scopes the tag by both user and widget, distinctly from widgetCacheTag", () => {
    expect(widgetSettingsTag("user-1", "steam")).toBe("widget-settings:user-1:steam");
    expect(widgetSettingsTag("user-1", "steam")).not.toBe(widgetCacheTag("user-1", "steam"));
  });
});
