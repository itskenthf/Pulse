import type { Widget } from "@pulse/sdk";
import type { NotebookWidgetActions } from "./actions";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { NotebookComponent } from "./component";
import { deriveNotebookMemories } from "./derive-memories";
import { fetchNotebookData } from "./fetch";
import { notebookDataSchema, type NotebookData } from "./types";

export const notebookWidget: Widget<NotebookData, Record<string, unknown>, NotebookWidgetActions> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "lg",
  refreshInterval: 900, // 15 min — self-healing backstop; mutations refresh instantly on their own
  fetchData: fetchNotebookData,
  dataSchema: notebookDataSchema,
  render: NotebookComponent,
  permissions: () => [],
  deriveMemories: deriveNotebookMemories,
};
