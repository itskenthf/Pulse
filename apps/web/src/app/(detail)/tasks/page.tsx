import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readWidgetCache } from "@pulse/database";
import { EmptyState } from "@pulse/ui";
import { AddTaskForm, TASKS_WIDGET_ID, TaskRow, taskDataSchema, type Task } from "@pulse/widget-tasks";
import { auth } from "@/auth";
import { addTaskAction, deleteTaskAction, toggleTaskAction } from "@/app/actions/tasks";

export const metadata: Metadata = { title: "Tasks" };

function TaskGroup({
  label,
  tasks,
}: {
  label: string;
  tasks: Task[];
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-heading text-sm font-semibold tracking-[0.08em] text-[var(--color-accent-700)] uppercase">
        {label}
      </h2>
      <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            toggleAction={toggleTaskAction}
            deleteAction={deleteTaskAction}
          />
        ))}
      </div>
    </div>
  );
}

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const cached = await readWidgetCache(session.user.id, TASKS_WIDGET_ID, taskDataSchema);
  const tasks = cached?.data.tasks ?? [];
  const incomplete = tasks.filter((task) => !task.completed);
  const completed = tasks.filter((task) => task.completed);

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">
        Tasks
      </h1>

      <AddTaskForm action={addTaskAction} />

      {tasks.length === 0 ? (
        <EmptyState message="No tasks yet — add one above." />
      ) : (
        <div className="flex flex-col gap-6">
          <TaskGroup label="Incomplete" tasks={incomplete} />
          <TaskGroup label="Completed" tasks={completed} />
        </div>
      )}
    </>
  );
}
