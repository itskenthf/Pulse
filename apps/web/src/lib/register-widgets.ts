import { registerWidget } from "@pulse/sdk";
import { weatherWidget } from "@pulse/widget-weather";
import { greetingWidget } from "@pulse/widget-greeting";
import { clockWidget } from "@pulse/widget-clock";
import { githubWidget } from "@pulse/widget-github";
import { steamWidget } from "@pulse/widget-steam";
import { quoteWidget } from "@pulse/widget-quote";
import { quickLaunchWidget } from "@pulse/widget-quick-launch";
import { spotifyWidget } from "@pulse/widget-spotify";

// Side-effect import target: the shell only ever calls registerWidget(),
// never imports a widget's internals directly (reference doc §5).
registerWidget(weatherWidget);
registerWidget(greetingWidget);
registerWidget(clockWidget);
registerWidget(githubWidget);
registerWidget(steamWidget);
registerWidget(quoteWidget);
registerWidget(quickLaunchWidget);
registerWidget(spotifyWidget);
