import type { Widget } from "@pulse/sdk";
import type { NutritionWidgetActions } from "./actions";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { NutritionComponent } from "./component";
import { fetchNutritionData } from "./fetch";
import { nutritionDataSchema, type NutritionData } from "./types";

export const nutritionWidget: Widget<NutritionData, Record<string, unknown>, NutritionWidgetActions> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 900,
  fetchData: fetchNutritionData,
  dataSchema: nutritionDataSchema,
  render: NutritionComponent,
  permissions: () => [],
};
