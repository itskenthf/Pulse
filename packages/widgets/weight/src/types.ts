import { z } from "zod";

const weightLogSchema = z.object({
  id: z.string(),
  weightKg: z.number(),
  loggedOn: z.string(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const weightGoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  targetValue: z.number(),
  comparator: z.enum(["at_least", "at_most", "exactly"]),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk) — kept in sync with @pulse/database's
 * `WeightLog`/`Goal` by hand, same as Tasks/Reading. `logs` is newest
 * first, capped at RECENT_LOG_LIMIT — enough history for the trend graph
 * without an unbounded cache row.
 */
export const weightDataSchema = z.object({
  logs: z.array(weightLogSchema),
  goal: weightGoalSchema.nullable(),
  fetchedAt: z.string(),
});

export type WeightLogEntry = z.infer<typeof weightLogSchema>;
export type WeightGoal = z.infer<typeof weightGoalSchema>;
export type WeightData = z.infer<typeof weightDataSchema>;
