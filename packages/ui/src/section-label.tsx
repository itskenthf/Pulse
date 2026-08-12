import type { ReactNode } from "react";

export interface SectionLabelProps {
  children: ReactNode;
}

/**
 * The small uppercase tracked heading used above a sub-section within a
 * widget or detail page ("History", "Incomplete", "Set a goal", ...) —
 * same styling, independently duplicated as an inline `<h2>` across
 * every widget/page that has more than one section — see
 * docs/DECISIONS.md's 2026-08-12 entry.
 */
export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <h2 className="font-heading text-sm font-semibold tracking-[0.08em] text-[var(--color-accent-700)] uppercase">
      {children}
    </h2>
  );
}
