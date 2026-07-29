import type { ReactNode } from "react";
import type { WidgetSize } from "@pulse/sdk";

/** Rough relative height proxy per widget size, reusing the SDK's
 *  existing `size` field rather than a separate per-widget table. */
export const WIDGET_WEIGHT: Record<WidgetSize, number> = { sm: 1, md: 2, lg: 3, hero: 0 };

/** No per-widget overrides today — Steam needed one when its cover art
 *  rendered as a tall single-column stack (see docs/DECISIONS.md,
 *  2026-07-25), but its 2-column grid (2026-07-27) brought its real
 *  height back in line with its "md" size, so the override was removed. */
export const WIDGET_WEIGHT_OVERRIDE: Record<string, number> = {};

export interface ColumnItem {
  weight: number;
  node: ReactNode;
  /** "Coming soon" cards with no real data yet — sorted below every
   *  data-bearing widget in the single-column mobile stack. */
  placeholder?: boolean;
}

/** Greedily assigns each item to whichever column currently has the
 *  lower running weight, so the two independent flex columns end up
 *  close in total height instead of one being arbitrarily starved (see
 *  page.tsx's WidgetGrid doc comment). Ties go left, so the heaviest/
 *  first item (GitHub) anchors the wide column same as before.
 *
 *  `items` arrives priority-sorted (real widgets first, "coming soon"
 *  placeholders last). Rather than greedily assigning each item to
 *  whichever column is currently lighter — which can freely interleave
 *  items across columns and scramble that priority order — this walks
 *  the list in order, filling `left` until its running weight crosses
 *  half the total, then sending everything else to `right`. Mobile
 *  collapses the two columns to one stack by rendering `left` fully
 *  before `right`, so this ordering is exactly what appears there: no
 *  CSS `order` trick needed, and the DOM order a keyboard/screen-reader
 *  user tabs through matches what's on screen at every breakpoint.
 *
 *  Extracted out of page.tsx so this pure layout math can be unit tested
 *  without pulling in page.tsx's Server Component tree (auth, Supabase
 *  clients, widget registration side effects).
 */
export function balanceColumns(items: ColumnItem[]): { left: ReactNode[]; right: ReactNode[] } {
  const left: ReactNode[] = [];
  const right: ReactNode[] = [];
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const half = totalWeight / 2;
  let leftWeight = 0;

  items.forEach((item, index) => {
    const node = <div key={index}>{item.node}</div>;

    if (leftWeight < half) {
      left.push(node);
      leftWeight += item.weight;
    } else {
      right.push(node);
    }
  });

  return { left, right };
}
