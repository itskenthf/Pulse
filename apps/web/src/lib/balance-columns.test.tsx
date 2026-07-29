import { describe, expect, it } from "vitest";
import { balanceColumns, type ColumnItem } from "./balance-columns";

function item(weight: number, label: string): ColumnItem {
  return { weight, node: label };
}

/** Renders each column's items back to their plain label for easy
 *  assertions — balanceColumns wraps every node in a keyed <div>. */
function labelsOf(nodes: ReturnType<typeof balanceColumns>["left"]): string[] {
  return nodes.map((node) => {
    const element = node as { props: { children: string } };
    return element.props.children;
  });
}

describe("balanceColumns", () => {
  it("puts the heaviest first item in the left column and balances the rest", () => {
    const { left, right } = balanceColumns([
      item(3, "github"), // lg
      item(2, "spotify"), // md
      item(2, "steam"), // md
      item(1, "tasks"), // sm
    ]);

    // total weight 8, half = 4. left fills until >=4: github(3) -> 3 < 4,
    // spotify(2) -> 5 >= 4 stop adding to left after this.
    expect(labelsOf(left)).toEqual(["github", "spotify"]);
    expect(labelsOf(right)).toEqual(["steam", "tasks"]);
  });

  it("ties go left, so the first item anchors the wide column", () => {
    const { left, right } = balanceColumns([item(1, "a"), item(1, "b")]);

    expect(labelsOf(left)).toEqual(["a"]);
    expect(labelsOf(right)).toEqual(["b"]);
  });

  it("keeps every item's original order — DOM order matches what a keyboard/screen-reader user tabs through", () => {
    const items = [item(1, "a"), item(1, "b"), item(1, "c"), item(1, "d"), item(1, "e")];

    const { left, right } = balanceColumns(items);

    expect([...labelsOf(left), ...labelsOf(right)]).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("sends every item to the left column when there is only one", () => {
    const { left, right } = balanceColumns([item(3, "hero")]);

    expect(labelsOf(left)).toEqual(["hero"]);
    expect(right).toEqual([]);
  });

  it("handles an empty item list without dividing by zero", () => {
    const { left, right } = balanceColumns([]);

    expect(left).toEqual([]);
    expect(right).toEqual([]);
  });

  it("sends every item to the right column when every weight is zero — half is 0, so `leftWeight < half` (0 < 0) is false from the very first item; not a bug in practice since hero (the only zero-weight size) is filtered out before reaching balanceColumns, but worth pinning down as the actual edge-case behavior", () => {
    const { left, right } = balanceColumns([item(0, "a"), item(0, "b")]);

    expect(left).toEqual([]);
    expect(labelsOf(right)).toEqual(["a", "b"]);
  });
});
