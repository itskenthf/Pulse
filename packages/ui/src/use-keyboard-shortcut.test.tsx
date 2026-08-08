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
});
