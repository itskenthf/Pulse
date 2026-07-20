import { registerWidget } from "@pulse/sdk";
import { weatherWidget } from "@pulse/widget-weather";

// Side-effect import target: the shell only ever calls registerWidget(),
// never imports a widget's internals directly (reference doc §5).
registerWidget(weatherWidget);
