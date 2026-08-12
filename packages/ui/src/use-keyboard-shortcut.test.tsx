import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useKeyboardShortcut } from "./use-keyboard-shortcut";

function renderWithSpy(enabled?: boolean) {
  const onShortcut = vi.fn();
  function Page() {
    useKeyboardShortcut("r", onShortcut, { enabled });
    return <input type="text" aria-label="Text field" />;
  }
  render(<Page />);
  return onShortcut;
}

describe("useKeyboardShortcut", () => {
  it("fires the handler on a bare keypress of the configured key", () => {
    const onShortcut = renderWithSpy();

    fireEvent.keyDown(document, { key: "r" });

    expect(onShortcut).toHaveBeenCalledTimes(1);
  });

  it("is case-insensitive", () => {
    const onShortcut = renderWithSpy();

    fireEvent.keyDown(document, { key: "R" });

    expect(onShortcut).toHaveBeenCalledTimes(1);
  });

  it("does not fire for a different key", () => {
    const onShortcut = renderWithSpy();

    fireEvent.keyDown(document, { key: "t" });

    expect(onShortcut).not.toHaveBeenCalled();
  });

  it("does not fire when a modifier key is held", () => {
    const onShortcut = renderWithSpy();

    fireEvent.keyDown(document, { key: "r", metaKey: true });
    fireEvent.keyDown(document, { key: "r", ctrlKey: true });
    fireEvent.keyDown(document, { key: "r", altKey: true });

    expect(onShortcut).not.toHaveBeenCalled();
  });

  it("does not fire while focus is inside a text input", () => {
    const onShortcut = renderWithSpy();
    const input = screen.getByLabelText("Text field");
    input.focus();

    fireEvent.keyDown(input, { key: "r" });

    expect(onShortcut).not.toHaveBeenCalled();
  });

  it("does not fire when disabled", () => {
    const onShortcut = renderWithSpy(false);

    fireEvent.keyDown(document, { key: "r" });

    expect(onShortcut).not.toHaveBeenCalled();
  });

  it("keeps a single listener across re-renders that pass a new handler identity, and always calls the latest one", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const calls: number[] = [];

    function Page() {
      const [count, setCount] = useState(0);
      // A fresh closure every render, deliberately — this is the case
      // that used to tear down and re-add the document listener on every
      // render (see docs/DECISIONS.md's 2026-08-12 entry).
      useKeyboardShortcut("r", () => calls.push(count));
      return (
        <button type="button" onClick={() => setCount((c) => c + 1)}>
          Bump
        </button>
      );
    }
    render(<Page />);

    const keydownCallsAfterMount = addSpy.mock.calls.filter(([type]) => type === "keydown").length;
    expect(keydownCallsAfterMount).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Bump" }));
    fireEvent.click(screen.getByRole("button", { name: "Bump" }));

    // Still exactly one "keydown" listener ever added, despite two
    // re-renders each passing a brand-new handler closure.
    expect(addSpy.mock.calls.filter(([type]) => type === "keydown").length).toBe(1);

    fireEvent.keyDown(document, { key: "r" });

    // And the listener still calls the *latest* handler, closing over the
    // up-to-date `count`, not the one from mount.
    expect(calls).toEqual([2]);

    addSpy.mockRestore();
  });
});
