import { registerWidget } from "@pulse/sdk";
import { heroWidget } from "@pulse/widget-hero";
import { githubWidget } from "@pulse/widget-github";
import { notesWidget } from "@pulse/widget-notes";
import { notebookWidget } from "@pulse/widget-notebook";
import { readingWidget } from "@pulse/widget-reading";
import { rssWidget } from "@pulse/widget-rss";
import { steamWidget } from "@pulse/widget-steam";
import { spotifyWidget } from "@pulse/widget-spotify";
import { mealsWidget } from "@pulse/widget-meals";
import { nutritionWidget } from "@pulse/widget-nutrition";
import { tasksWidget } from "@pulse/widget-tasks";
import { weightWidget } from "@pulse/widget-weight";

// Side-effect import target: the shell only ever calls registerWidget(),
// never imports a widget's internals directly (reference doc §5).
registerWidget(heroWidget);
registerWidget(githubWidget);
registerWidget(steamWidget);
registerWidget(spotifyWidget);
registerWidget(tasksWidget);
registerWidget(notesWidget);
registerWidget(notebookWidget);
registerWidget(readingWidget);
registerWidget(rssWidget);
registerWidget(weightWidget);
registerWidget(nutritionWidget);
registerWidget(mealsWidget);
