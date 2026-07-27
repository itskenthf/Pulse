import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { GitHubComponent } from "./component";
import { deriveGitHubMemories } from "./derive-memories";
import { fetchGitHubData } from "./fetch";
import { githubDataSchema, type GitHubData } from "./types";

export const githubWidget: Widget<GitHubData> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "lg",
  refreshInterval: 1800, // 30 min — contributions don't need minute-level freshness
  fetchData: fetchGitHubData,
  dataSchema: githubDataSchema,
  render: GitHubComponent,
  permissions: () => ["read:user"],
  deriveMemories: deriveGitHubMemories,
};
