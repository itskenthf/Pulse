import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./modal";

function TestHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Trigger</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Test modal">
        <p>Modal content</p>
      </Modal>
    </div>
  );
}

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(<Modal open={false} onClose={() => {}} title="Test modal">content</Modal>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the panel with its title and content when open", () => {
    render(
      <Modal open onClose={() => {}} title="Test modal">
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Test modal")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test modal">
        content
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on a click on the backdrop, not the panel", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test modal">
        <p>Modal content</p>
      </Modal>,
    );

    fireEvent.click(screen.getByText("Modal content"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test modal">
        content
      </Modal>,
    );

    fireEvent.click(screen.getByLabelText("Close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns focus to the trigger after closing", () => {
    render(<TestHarness />);
    const trigger = screen.getByText("Trigger");
    // jsdom's fireEvent.click doesn't move focus the way a real browser
    // click does, so focus explicitly first to simulate that part of a
    // real click before opening the modal.
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(trigger).toHaveFocus();
  });
});
