"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { IconButton, UndoableDeleteRow, useUndoableDelete } from "@pulse/ui";
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
      <UndoableDeleteRow
        label={`${log.weightKg.toFixed(1)}kg deleted`}
        onUndo={undo}
        formRef={formRef}
        deleteAction={deleteFormAction}
      >
        <input type="hidden" name="logId" value={log.id} />
      </UndoableDeleteRow>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 py-3">
      <div>
        <p className="font-medium text-[var(--foreground)]">{log.weightKg.toFixed(1)}kg</p>
        <p className="text-xs text-[var(--color-neutral-500)]">{formatDate(log.loggedOn)}</p>
      </div>
      <IconButton
        onClick={requestDelete}
        aria-label={`Delete weigh-in from ${formatDate(log.loggedOn)}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
