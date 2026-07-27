import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDismissableMenu } from "./use-dismissable-menu";

/**
 * Mirrors WidgetMenu/ProfileMenu's real shape: rootRef wraps both the
 * trigger and the panel, so a tap anywhere inside either one never closes
 * the menu — only a tap genuinely outside does.
 */
function TestMenu() {
  const { open, setOpen, close, rootRef, triggerRef } = useDismissableMenu<
    HTMLDivElement,
    HTMLButtonElement
  >();

  return (
    <div>
      <div ref={rootRef}>
        <button ref={triggerRef} onClick={() => setOpen((value) => !value)}>
          Trigger
        </button>
        {open && (
          <div role="menu">
            <button onClick={close}>Close</button>
          </div>
        )}
      </div>
      <button>Outside</button>
    </div>
  );
}

describe("useDismissableMenu", () => {
  it("opens on a click/tap on the trigger", () => {
    render(<TestMenu />);
    fireEvent.click(screen.getByText("Trigger"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("closes when a pointerdown happens outside the root — the real fix for the mobile tap bug (previously relied on CSS :focus-within, which mobile Safari doesn't reliably trigger on tap)", () => {
    render(<TestMenu />);
    fireEvent.click(screen.getByText("Trigger"));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByText("Outside"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("does not close on a pointerdown inside the root (trigger or panel)", () => {
    render(<TestMenu />);
    fireEvent.click(screen.getByText("Trigger"));

    fireEvent.pointerDown(screen.getByRole("menu"));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("closes and returns focus to the trigger on Escape", () => {
    render(<TestMenu />);
    const trigger = screen.getByText("Trigger");
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
