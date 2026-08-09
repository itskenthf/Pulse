import type { Widget } from "@pulse/sdk";
import type { WeightWidgetActions } from "./actions";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { WeightComponent } from "./component";
import { deriveWeightMemories } from "./derive-memories";
import { fetchWeightData } from "./fetch";
import { weightDataSchema, type WeightData } from "./types";

export const weightWidget: Widget<WeightData, Record<string, unknown>, WeightWidgetActions> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 900,
  fetchData: fetchWeightData,
  dataSchema: weightDataSchema,
  render: WeightComponent,
  permissions: () => [],
  deriveMemories: deriveWeightMemories,
};
