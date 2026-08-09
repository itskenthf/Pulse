"use server";

import { addBook, deleteBook, markBookFinished, updateBookProgress } from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { READING_WIDGET_ID } from "@pulse/widget-reading";
import { runWidgetWriteAction } from "@/lib/run-widget-write-action";

const REVALIDATE_PATHS = ["/", "/reading"];

export async function addBookAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: READING_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to add book",
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

      await addBook(userId, {
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
      const bookId = formData.get("bookId");
      const currentPage = formData.get("currentPage");
      if (typeof bookId !== "string") {
        return { error: "Invalid book" };
      }
      const currentPageNum = typeof currentPage === "string" ? Number(currentPage) : NaN;
      if (!Number.isInteger(currentPageNum) || currentPageNum < 0) {
        return { error: "Current page must be zero or a positive number" };
      }

      await updateBookProgress(userId, bookId, currentPageNum);
    },
  });
}

export async function markFinishedAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: READING_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to mark book finished",
    write: async (userId, formData) => {
      const bookId = formData.get("bookId");
      if (typeof bookId !== "string") {
        return { error: "Invalid book" };
      }
      await markBookFinished(userId, bookId);
    },
  });
}

export async function deleteBookAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: READING_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to delete book",
    write: async (userId, formData) => {
      const bookId = formData.get("bookId");
      if (typeof bookId !== "string") {
        return { error: "Invalid book" };
      }
      await deleteBook(userId, bookId);
    },
  });
}
