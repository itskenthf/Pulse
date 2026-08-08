import { describe, expect, it } from "vitest";
import { isExternalHref, memoryHref } from "./memory-sources";

describe("memoryHref", () => {
  it("links a GitHub memory to the PR URL from its metadata", () => {
    expect(memoryHref("github", { url: "https://github.com/x/y/pull/1" })).toBe(
      "https://github.com/x/y/pull/1",
    );
  });

  it("returns null for a GitHub memory with no url in its metadata", () => {
    expect(memoryHref("github", {})).toBeNull();
  });

  it("links a Steam memory to its game's detail page", () => {
    expect(memoryHref("steam", { appId: 1623730 })).toBe("/steam/1623730");
  });

  it("returns null for a Steam memory with no appId in its metadata", () => {
    expect(memoryHref("steam", {})).toBeNull();
  });

  it("links Notebook/Notes/Tasks memories to their list pages regardless of metadata", () => {
    expect(memoryHref("notebook", {})).toBe("/notebook");
    expect(memoryHref("notes", {})).toBe("/notes");
    expect(memoryHref("tasks", {})).toBe("/tasks");
  });

  it("returns null for a source with no link target, like Spotify", () => {
    expect(memoryHref("spotify", {})).toBeNull();
  });

  it("returns null for an unknown source", () => {
    expect(memoryHref("unknown-widget", {})).toBeNull();
  });
});

describe("isExternalHref", () => {
  it("treats http(s) URLs as external", () => {
    expect(isExternalHref("https://github.com/x/y/pull/1")).toBe(true);
    expect(isExternalHref("http://example.com")).toBe(true);
  });

  it("treats app-relative paths as internal", () => {
    expect(isExternalHref("/steam/1623730")).toBe(false);
    expect(isExternalHref("/notebook")).toBe(false);
  });
});
