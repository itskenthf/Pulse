import type { Widget } from "@pulse/sdk";
import type { MealsWidgetActions } from "./actions";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { MealsComponent } from "./component";
import { fetchMealsData } from "./fetch";
import { mealsDataSchema, type MealsData } from "./types";

export const mealsWidget: Widget<MealsData, Record<string, unknown>, MealsWidgetActions> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 900,
  fetchData: fetchMealsData,
  dataSchema: mealsDataSchema,
  render: MealsComponent,
  permissions: () => [],
};
