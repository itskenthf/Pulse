import { z } from "zod";

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  dueAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk) — kept in sync with
 * @pulse/database's `Task` by hand, since a plain TS interface can't be
 * turned into a schema automatically.
 */
export const taskDataSchema = z.object({
  tasks: z.array(taskSchema),
  fetchedAt: z.string(),
});

export type Task = z.infer<typeof taskSchema>;
export type TaskData = z.infer<typeof taskDataSchema>;
