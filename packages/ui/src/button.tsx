import type { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * The outlined accent button every widget form's primary action
 * ("Save"/"Add"/"Log"/"Set goal"/...) used to hand-roll separately —
 * design system's "outlined buttons, never solid-filled" rule (see
 * docs/DESIGN_SYSTEM.md), previously duplicated across 11 files rather
 * than defined once. A thin wrapper, not a variant system: every call
 * site was already this one look, just copy-pasted — see
 * docs/DECISIONS.md's 2026-08-12 entry.
 */
export function Button({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`min-h-11 rounded-[4px] border border-[var(--color-accent)] px-3 text-sm font-medium text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
