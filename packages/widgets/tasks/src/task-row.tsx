"use client";

import { useActionState, useRef } from "react";
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
  const [, toggleFormAction, isToggling] = useActionState(toggleAction, initialState);
  const [, deleteFormAction] = useActionState(deleteAction, initialState);
  const toggleFormRef = useRef<HTMLFormElement>(null);
  const { pending: pendingDelete, requestDelete, undo, formRef: deleteFormRef } = useUndoableDelete();

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
      <form ref={toggleFormRef} action={toggleFormAction} className="flex h-11 w-11 shrink-0 items-center justify-center">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="completed" value={(!task.completed).toString()} />
        <input
          type="checkbox"
          checked={task.completed}
          disabled={isToggling}
          onChange={() => toggleFormRef.current?.requestSubmit()}
          aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Complete "${task.title}"`}
          className="h-4 w-4 accent-[var(--color-accent)]"
        />
      </form>
      <span
        className={`flex-1 truncate text-sm transition-colors duration-150 ${
          task.completed
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
