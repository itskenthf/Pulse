"use server";

import { clearBook, startBook, updateReadingProgress } from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { READING_WIDGET_ID } from "@pulse/widget-reading";
import { runWidgetWriteAction } from "@/lib/run-widget-write-action";

const REVALIDATE_PATHS = ["/"];

export async function startBookAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: READING_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to start book",
    write: async (userId, formData) => {
      const title = formData.get("title");
      const author = formData.get("author");
      const totalPage = formData.get("totalPage");

      if (typeof title !== "string" || !title.trim()) {
        return { error: "Title can't be empty" };
      }
      const totalPageNum = typeof totalPage === "string" ? Number(totalPage) : NaN;
      if (!Number.isInteger(totalPageNum) || totalPageNum <= 0) {
        return { error: "Total pages must be a positive number" };
      }

      await startBook(userId, {
        title: title.trim(),
        author: typeof author === "string" ? author.trim() : "",
        totalPage: totalPageNum,
      });
    },
  });
}

export async function updateProgressAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: READING_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to update progress",
    write: async (userId, formData) => {
      const currentPage = formData.get("currentPage");
      const currentPageNum = typeof currentPage === "string" ? Number(currentPage) : NaN;
      if (!Number.isInteger(currentPageNum) || currentPageNum < 0) {
        return { error: "Current page must be zero or a positive number" };
      }

      await updateReadingProgress(userId, currentPageNum);
    },
  });
}

export async function clearBookAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: READING_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to clear book",
    write: async (userId) => {
      await clearBook(userId);
    },
  });
}
