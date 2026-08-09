"use client";

import { useActionState } from "react";
import { Trash2, Undo2 } from "lucide-react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { useUndoableDelete } from "@pulse/ui";
import type { WeightLogEntry } from "./types";

const initialState: WidgetActionState = {};

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** A single weigh-in on /health/weight — the same undo-window delete
 *  pattern as Tasks/Reading's own rows. */
export function WeightLogRow({
  log,
  deleteAction,
}: {
  log: WeightLogEntry;
  deleteAction: WidgetAction;
}) {
  const [, deleteFormAction] = useActionState(deleteAction, initialState);
  const { pending, requestDelete, undo, formRef } = useUndoableDelete();

  if (pending) {
    return (
      <div className="flex items-center justify-between gap-2 py-2 text-sm text-[var(--color-neutral-500)]">
        <span>{log.weightKg.toFixed(1)}kg deleted</span>
        <button
          type="button"
          onClick={undo}
          className="flex min-h-11 shrink-0 items-center gap-1.5 px-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Undo
        </button>
        <form ref={formRef} action={deleteFormAction} className="hidden">
          <input type="hidden" name="logId" value={log.id} />
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 py-3">
      <div>
        <p className="font-medium text-[var(--foreground)]">{log.weightKg.toFixed(1)}kg</p>
        <p className="text-xs text-[var(--color-neutral-500)]">{formatDate(log.loggedOn)}</p>
      </div>
      <button
        type="button"
        onClick={requestDelete}
        aria-label={`Delete weigh-in from ${formatDate(log.loggedOn)}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-neutral-400)] hover:bg-current/10 hover:text-red-600"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
