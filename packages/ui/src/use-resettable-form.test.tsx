import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WidgetAction } from "@pulse/sdk";
import { useResettableForm } from "./use-resettable-form";

function TestForm({ action }: { action: WidgetAction }) {
  const { state, formAction, isPending, formRef } = useResettableForm(action);

  return (
    <form ref={formRef} action={formAction}>
      <button type="submit" disabled={isPending}>
        Submit
      </button>
      {state.error && <span>error:{state.error}</span>}
    </form>
  );
}

describe("useResettableForm", () => {
  it("resets the form once a successful submission settles", async () => {
    const action: WidgetAction = async () => ({});
    render(<TestForm action={action} />);
    const form = screen.getByRole("button").closest("form")!;
    const resetSpy = vi.spyOn(form, "reset");

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => expect(resetSpy).toHaveBeenCalledTimes(1));
  });

  it("surfaces the action's returned error via state, without throwing", async () => {
    const action: WidgetAction = async () => ({ error: "nope" });
    render(<TestForm action={action} />);

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => expect(screen.getByText("error:nope")).toBeInTheDocument());
    expect(screen.getByText("Submit")).not.toBeDisabled();
  });
});
