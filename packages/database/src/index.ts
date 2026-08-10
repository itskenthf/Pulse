export { createServiceClient } from "./client";
export { readWidgetCache, writeWidgetCache } from "./widget-cache";
export type { CachedWidgetData } from "./widget-cache";
export { readWidgetSettings, writeWidgetSettings } from "./widget-settings";
export { ensureWidgetRegistered } from "./widget-registry";
export { listUserIds, readUserName } from "./users";
export { writeMemories, listMemories } from "./memories";
export type { Memory } from "./memories";
export { listTasks, createTask, setTaskCompleted, deleteTask } from "./tasks";
export type { Task } from "./tasks";
export { listNotes, createNote, updateNote, deleteNote } from "./notes";
export type { Note } from "./notes";
export { listNotebookEntries, createNotebookEntry, updateNotebookEntry } from "./notebook";
export type { NotebookEntry } from "./notebook";
export { listBooks, addBook, updateBookProgress, markBookFinished, deleteBook } from "./reading";
export type { Reading } from "./reading";
export { listWeightLogs, logWeight, deleteWeightLog } from "./weight";
export type { WeightLog } from "./weight";
export { getTodayNutrition, incrementNutrition, setNutritionField, listNutritionHistory } from "./nutrition";
export type { NutritionLog, NutritionField } from "./nutrition";
export { getTodayMeals, setMealChecked, listMealHistory } from "./meals";
export type { MealCheck, Meal } from "./meals";
export { listGoals, createGoal, deactivateGoal } from "./goals";
export type { Goal, GoalMetric, GoalComparator, GoalCadence } from "./goals";
export { getCurrentWeekReview, upsertCurrentWeekReview, listWeeklyReviews } from "./weekly-review";
export type { WeeklyReview } from "./weekly-review";
export {
  readProviderAccessToken,
  readProviderAccount,
  updateProviderAccountTokenIfCurrent,
  upsertProviderAccount,
} from "./accounts";
export type { ProviderAccount } from "./accounts";
