import { CheckSquare } from "lucide-react";
import Link from "next/link";
import { WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import type { TaskWidgetActions } from "./actions";
import { AddTaskForm } from "./add-task-form";
import type { TaskData } from "./types";

export function TasksComponent({
  actions,
}: WidgetRenderProps<TaskData, Record<string, unknown>, TaskWidgetActions>) {
  return (
    <WidgetCard
      title="Tasks"
      icon={<CheckSquare className="h-4 w-4" aria-hidden="true" />}
      action={<WidgetMenu id="tasks" actions={actions} />}
      compact
      footer={
        <Link
          href="/tasks"
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          View all →
        </Link>
      }
    >
      <AddTaskForm action={actions.addTask} />
    </WidgetCard>
  );
}
