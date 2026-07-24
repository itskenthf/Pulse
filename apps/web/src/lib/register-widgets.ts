import { registerWidget } from "@pulse/sdk";
import { heroWidget } from "@pulse/widget-hero";
import { githubWidget } from "@pulse/widget-github";
import { steamWidget } from "@pulse/widget-steam";
import { quickLaunchWidget } from "@pulse/widget-quick-launch";
import { spotifyWidget } from "@pulse/widget-spotify";

// Side-effect import target: the shell only ever calls registerWidget(),
// never imports a widget's internals directly (reference doc §5).
registerWidget(heroWidget);
registerWidget(githubWidget);
registerWidget(steamWidget);
registerWidget(quickLaunchWidget);
registerWidget(spotifyWidget);
