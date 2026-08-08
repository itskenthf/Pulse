import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUndoableDelete } from "./use-undoable-delete";

function TestRow({ onCommit, windowMs }: { onCommit: () => void; windowMs?: number }) {
  const { pending, requestDelete, undo, formRef } = useUndoableDelete(windowMs);

  return (
    <div>
      <span>pending:{String(pending)}</span>
      <button type="button" onClick={requestDelete}>
        Delete
      </button>
      <button type="button" onClick={undo}>
        Undo
      </button>
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          onCommit();
        }}
      />
    </div>
  );
}

describe("useUndoableDelete", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not commit immediately when requestDelete is called", () => {
    const onCommit = vi.fn();
    render(<TestRow onCommit={onCommit} />);

    fireEvent.click(screen.getByText("Delete"));

    expect(screen.getByText("pending:true")).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("commits (submits the real delete form) once the window elapses without undo", () => {
    const onCommit = vi.fn();
    render(<TestRow onCommit={onCommit} windowMs={1000} />);

    fireEvent.click(screen.getByText("Delete"));
    vi.advanceTimersByTime(1000);

    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("never commits when undo is called before the window elapses", () => {
    const onCommit = vi.fn();
    render(<TestRow onCommit={onCommit} windowMs={1000} />);

    fireEvent.click(screen.getByText("Delete"));
    vi.advanceTimersByTime(500);
    fireEvent.click(screen.getByText("Undo"));
    vi.advanceTimersByTime(1000);

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText("pending:false")).toBeInTheDocument();
  });
});
