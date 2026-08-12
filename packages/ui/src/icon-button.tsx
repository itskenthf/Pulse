import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/**
 * The 44px round icon button used for a destructive row action (delete a
 * task/note/book/weigh-in) — identical styling previously duplicated
 * across three widgets' own row components. Named for what it's actually
 * used for everywhere it currently appears (a danger action) rather than
 * a general variant system nothing yet needs — see docs/DECISIONS.md's
 * 2026-08-12 entry.
 */
export function IconButton({ className = "", children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-neutral-400)] hover:bg-current/10 hover:text-red-600 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
