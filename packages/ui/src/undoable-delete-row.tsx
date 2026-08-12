import type { ReactNode, RefObject } from "react";
import { Undo2 } from "lucide-react";

export interface UndoableDeleteRowProps {
  /** What deleted, e.g. `"Buy milk" deleted` or `72.4kg deleted`. */
  label: ReactNode;
  onUndo: () => void;
  /** Attach `useUndoableDelete`'s own `formRef` here. */
  formRef: RefObject<HTMLFormElement | null>;
  /** The real delete action — nothing submits to it unless the undo
   *  window (owned by `useUndoableDelete`) elapses without `onUndo`. */
  deleteAction: (formData: FormData) => void;
  /** Hidden `<input type="hidden">` fields the delete action needs. */
  children: ReactNode;
}

/**
 * The row shown in place of a list item while its delete is pending —
 * label, an "Undo" affordance, and the hidden real delete form
 * `useUndoableDelete`'s timer eventually submits. Pairs with that hook
 * (state/timing) the same way this pairs with it structurally: the hook
 * was already shared, but this exact JSX shape was independently
 * duplicated across four widgets' row components — see
 * docs/DECISIONS.md's 2026-08-12 entry, including the minor gap/padding
 * inconsistencies between those four copies this settles on one value for.
 */
export function UndoableDeleteRow({
  label,
  onUndo,
  formRef,
  deleteAction,
  children,
}: UndoableDeleteRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 text-sm text-[var(--color-neutral-500)]">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onUndo}
        className="flex min-h-11 shrink-0 items-center gap-1.5 px-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Undo
      </button>
      <form ref={formRef} action={deleteAction} className="hidden">
        {children}
      </form>
    </div>
  );
}
