import type { ZodType } from "zod";
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
  // `Widget.dataSchema` is typed `ZodType<TData>`, which requires the
  // schema's input type to equal its output type exactly — but
  // `recentPullRequests`'s `.optional().default([])` (needed so cache
  // rows written before that field existed still parse, instead of
  // throwing in readWidgetCache) makes zod's inferred input type
  // optional where the output isn't. This is a real zod input/output
  // variance limitation, not a logic error being papered over — the
  // schema is exercised directly by types.test.ts's default-value case.
  dataSchema: githubDataSchema as ZodType<GitHubData>,
  render: GitHubComponent,
  permissions: () => ["read:user"],
  deriveMemories: deriveGitHubMemories,
};
