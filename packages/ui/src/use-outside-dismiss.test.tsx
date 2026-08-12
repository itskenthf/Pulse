import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useOutsideDismiss } from "./use-outside-dismiss";

function TestPanel({ onEscape }: { onEscape?: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useOutsideDismiss(open, rootRef, () => setOpen(false), onEscape ?? (() => setOpen(false)));

  return (
    <div>
      <button onClick={() => setOpen(true)}>Open</button>
      <div ref={rootRef}>{open && <div role="dialog">Panel</div>}</div>
      <button>Outside</button>
    </div>
  );
}

describe("useOutsideDismiss", () => {
  it("does nothing while inactive — no listeners fire", () => {
    render(<TestPanel />);
    fireEvent.pointerDown(screen.getByText("Outside"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onOutsidePointerDown when a pointerdown lands outside the root", () => {
    render(<TestPanel />);
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByText("Outside"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not dismiss on a pointerdown inside the root", () => {
    render(<TestPanel />);
    fireEvent.click(screen.getByText("Open"));

    fireEvent.pointerDown(screen.getByRole("dialog"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls the distinct onEscape callback on Escape, not onOutsidePointerDown", () => {
    const onEscape = vi.fn();
    render(<TestPanel onEscape={onEscape} />);
    fireEvent.click(screen.getByText("Open"));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});
