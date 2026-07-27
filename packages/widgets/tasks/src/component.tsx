import { CheckSquare } from "lucide-react";
import { EmptyState, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import type { TaskWidgetActions } from "./actions";
import { AddTaskForm } from "./add-task-form";
import { PREVIEW_TASK_COUNT } from "./constants";
import { TaskRow } from "./task-row";
import type { TaskData } from "./types";

export function TasksComponent({
  data,
  actions,
}: WidgetRenderProps<TaskData, Record<string, unknown>, TaskWidgetActions>) {
  const incomplete = (data?.tasks ?? [])
    .filter((task) => !task.completed)
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return a.dueAt.localeCompare(b.dueAt);
    })
    .slice(0, PREVIEW_TASK_COUNT);

  return (
    <WidgetCard
      title="Tasks"
      icon={<CheckSquare className="h-4 w-4" aria-hidden="true" />}
      action={<WidgetMenu id="tasks" actions={actions} />}
    >
      <div className="flex flex-col gap-3">
        <AddTaskForm action={actions.addTask} />
        {incomplete.length > 0 ? (
          <div className="flex flex-col divide-y divide-[var(--color-divider)]">
            {incomplete.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                toggleAction={actions.toggleTask}
                deleteAction={actions.deleteTask}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="Nothing to do — add a task above." />
        )}
        <a
          href="/tasks"
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          View all →
        </a>
      </div>
    </WidgetCard>
  );
}
