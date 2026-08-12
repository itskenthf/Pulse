"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { IconButton, UndoableDeleteRow, useUndoableDelete } from "@pulse/ui";
import type { Task } from "./types";

const initialState: WidgetActionState = {};

export function TaskRow({
  task,
  toggleAction,
  deleteAction,
}: {
  task: Task;
  toggleAction: WidgetAction;
  deleteAction: WidgetAction;
}) {
  // Bypasses <form action> in favor of calling toggleAction directly inside
  // the same startTransition as the optimistic flip — useOptimistic only
  // reverts to the real `task.completed` once *its own* transition settles,
  // so the update and the mutation have to share one transition rather than
  // useActionState's separately-triggered one. A failed write's catch below
  // is what makes that revert actually happen instead of leaving a lie on
  // screen.
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(task.completed);
  const [isToggling, startToggle] = useTransition();
  const [, deleteFormAction] = useActionState(deleteAction, initialState);
  const { pending: pendingDelete, requestDelete, undo, formRef: deleteFormRef } = useUndoableDelete();

  function handleToggle() {
    const next = !optimisticCompleted;
    startToggle(async () => {
      setOptimisticCompleted(next);
      const formData = new FormData();
      formData.set("taskId", task.id);
      formData.set("completed", String(next));
      try {
        await toggleAction(initialState, formData);
      } catch (err) {
        console.error(`Failed to toggle task "${task.id}":`, err);
      }
    });
  }

  if (pendingDelete) {
    return (
      <UndoableDeleteRow
        label={<>&ldquo;{task.title}&rdquo; deleted</>}
        onUndo={undo}
        formRef={deleteFormRef}
        deleteAction={deleteFormAction}
      >
        <input type="hidden" name="taskId" value={task.id} />
      </UndoableDeleteRow>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={optimisticCompleted}
          disabled={isToggling}
          onChange={handleToggle}
          aria-label={optimisticCompleted ? `Mark "${task.title}" incomplete` : `Complete "${task.title}"`}
          className="h-4 w-4 accent-[var(--color-accent)]"
        />
      </span>
      <span
        className={`flex-1 truncate text-sm transition-colors duration-150 ${
          optimisticCompleted
            ? "text-[var(--color-neutral-400)] line-through"
            : "text-[var(--foreground)]"
        }`}
      >
        {task.title}
      </span>
      <IconButton onClick={requestDelete} aria-label={`Delete "${task.title}"`}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
