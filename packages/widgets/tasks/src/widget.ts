import type { Widget } from "@pulse/sdk";
import type { TaskWidgetActions } from "./actions";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { TasksComponent } from "./component";
import { deriveTaskMemories } from "./derive-memories";
import { fetchTaskData } from "./fetch";
import { taskDataSchema, type TaskData } from "./types";

export const tasksWidget: Widget<TaskData, Record<string, unknown>, TaskWidgetActions> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 900, // 15 min — self-healing backstop; mutations refresh instantly on their own
  fetchData: fetchTaskData,
  dataSchema: taskDataSchema,
  render: TasksComponent,
  permissions: () => [],
  deriveMemories: deriveTaskMemories,
};
