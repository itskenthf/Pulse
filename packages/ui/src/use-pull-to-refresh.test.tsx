import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePullToRefresh } from "./use-pull-to-refresh";

function touch(clientY: number): { touches: [{ clientY: number }] } {
  return { touches: [{ clientY }] };
}

function TestPage({ onRefresh, pending }: { onRefresh: () => void; pending?: boolean }) {
  const { pullDistance, armed } = usePullToRefresh({ onRefresh, pending });
  return (
    <div>
      <span>distance:{pullDistance}</span>
      <span>armed:{String(armed)}</span>
    </div>
  );
}

describe("usePullToRefresh", () => {
  it("fires onRefresh when pulled past the trigger distance and released", () => {
    const onRefresh = vi.fn();
    render(<TestPage onRefresh={onRefresh} />);

    fireEvent.touchStart(document, touch(0));
    fireEvent.touchMove(document, touch(120));
    expect(screen.getByText("armed:true")).toBeInTheDocument();
    fireEvent.touchEnd(document);

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("distance:0")).toBeInTheDocument();
  });

  it("does not fire onRefresh when released before the trigger distance", () => {
    const onRefresh = vi.fn();
    render(<TestPage onRefresh={onRefresh} />);

    fireEvent.touchStart(document, touch(0));
    fireEvent.touchMove(document, touch(20));
    fireEvent.touchEnd(document);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("does not start tracking a pull that begins scrolled away from the top", () => {
    const onRefresh = vi.fn();
    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    render(<TestPage onRefresh={onRefresh} />);

    fireEvent.touchStart(document, touch(0));
    fireEvent.touchMove(document, touch(120));
    fireEvent.touchEnd(document);

    expect(onRefresh).not.toHaveBeenCalled();
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  it("does not fire a second overlapping refresh while one is already pending", () => {
    const onRefresh = vi.fn();
    render(<TestPage onRefresh={onRefresh} pending />);

    fireEvent.touchStart(document, touch(0));
    fireEvent.touchMove(document, touch(120));
    fireEvent.touchEnd(document);

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
