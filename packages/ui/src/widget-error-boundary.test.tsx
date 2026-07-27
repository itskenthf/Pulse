import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WidgetErrorBoundary } from "./widget-error-boundary";

function Boom(): never {
  throw new Error("widget blew up");
}

describe("WidgetErrorBoundary", () => {
  it("renders children normally when nothing throws", () => {
    render(
      <WidgetErrorBoundary name="GitHub">
        <p>Real widget content</p>
      </WidgetErrorBoundary>,
    );

    expect(screen.getByText("Real widget content")).toBeInTheDocument();
  });

  it("shows an ErrorState instead of crashing the whole tree when a child throws", () => {
    // React logs the error to the console during the throw — expected
    // noise for this test, not a real failure.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <WidgetErrorBoundary name="GitHub">
        <Boom />
      </WidgetErrorBoundary>,
    );

    expect(screen.getByText("GitHub is unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Other widgets are unaffected — it'll retry on the next refresh."),
    ).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it("recovers once resetKey changes, giving new children a fresh render attempt", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { rerender } = render(
      <WidgetErrorBoundary name="GitHub" resetKey={1}>
        <Boom />
      </WidgetErrorBoundary>,
    );
    expect(screen.getByText("GitHub is unavailable")).toBeInTheDocument();

    rerender(
      <WidgetErrorBoundary name="GitHub" resetKey={2}>
        <p>Recovered content</p>
      </WidgetErrorBoundary>,
    );

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    expect(screen.queryByText("GitHub is unavailable")).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});
