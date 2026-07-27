"use client";

import { useActionState, useRef } from "react";
import { Trash2 } from "lucide-react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
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
  const [, deleteFormAction, isDeleting] = useActionState(deleteAction, initialState);
  const toggleFormRef = useRef<HTMLFormElement>(null);

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
        className={`flex-1 truncate text-sm ${
          task.completed
            ? "text-[var(--color-neutral-400)] line-through"
            : "text-[var(--foreground)]"
        }`}
      >
        {task.title}
      </span>
      <form action={deleteFormAction}>
        <input type="hidden" name="taskId" value={task.id} />
        <button
          type="submit"
          disabled={isDeleting}
          aria-label={`Delete "${task.title}"`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-neutral-400)] hover:bg-current/10 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
