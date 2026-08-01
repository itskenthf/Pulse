"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { glassClass } from "./glass";
import { RADIUS } from "./tokens";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Pulse's first modal/dialog primitive (see docs/DECISIONS.md's
 * dashboard-polish entry) — a centered panel over a flat scrim, no blur
 * (per docs/DESIGN_SYSTEM.md: "no backdrop blur anywhere in the
 * system"), using the same `glassClass("heavy")` "floats above the
 * page" treatment `WidgetMenu`'s dropdown already uses. Closes on
 * Escape or a click on the backdrop itself (not the panel), and returns
 * focus to whatever triggered it on close — the same bar of a11y effort
 * as `useDismissableMenu`, not a full focus-trap (nothing else in this
 * codebase has one either).
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose is
    // recreated per render by callers; re-running this on every render
    // would re-lock scroll and re-focus the panel constantly.
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "color-mix(in srgb, #2d2b2b 40%, transparent)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto ${RADIUS.card} p-6 ${glassClass("heavy")} focus-visible:outline-none`}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="font-heading text-lg font-semibold text-[var(--foreground)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-neutral-400)] hover:bg-current/10 hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
