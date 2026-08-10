"use client";

import { useActionState } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import type { WeeklyReviewEntry } from "./types";

const initialState: WidgetActionState = {};

const FIELD_CLASS =
  "min-h-11 rounded-[4px] border border-[var(--color-divider)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--color-neutral-400)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none";

const RATING_FIELDS: { name: keyof Pick<WeeklyReviewEntry, "mood" | "energy" | "confidence" | "sleepQuality">; label: string }[] = [
  { name: "mood", label: "Mood" },
  { name: "energy", label: "Energy" },
  { name: "confidence", label: "Confidence" },
  { name: "sleepQuality", label: "Sleep quality" },
];

function RatingSelect({ name, label, value }: { name: string; label: string; value: number | null }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`review-${name}`} className="text-xs text-[var(--color-neutral-500)]">
        {label}
      </label>
      <select id={`review-${name}`} name={name} defaultValue={value ?? ""} className={FIELD_CLASS}>
        <option value="">—</option>
        {[1, 2, 3, 4, 5].map((rating) => (
          <option key={rating} value={rating}>
            {rating}
          </option>
        ))}
      </select>
    </div>
  );
}

/** The full weekly check-in — reachable any day (not gated to Sunday), so
 *  a missed Sunday doesn't lose the entry. Submits the whole form as one
 *  upsert via `saveReview`. */
export function ReviewForm({ review, action }: { review: WeeklyReviewEntry | null; action: WidgetAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RATING_FIELDS.map((field) => (
          <RatingSelect key={field.name} name={field.name} label={field.label} value={review?.[field.name] ?? null} />
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="review-biggestAchievement" className="text-xs text-[var(--color-neutral-500)]">
          Biggest achievement
        </label>
        <input
          id="review-biggestAchievement"
          name="biggestAchievement"
          defaultValue={review?.biggestAchievement ?? ""}
          placeholder="What went well this week?"
          disabled={isPending}
          className={FIELD_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="review-biggestStruggle" className="text-xs text-[var(--color-neutral-500)]">
          Biggest struggle
        </label>
        <input
          id="review-biggestStruggle"
          name="biggestStruggle"
          defaultValue={review?.biggestStruggle ?? ""}
          placeholder="What was hard this week?"
          disabled={isPending}
          className={FIELD_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="review-notes" className="text-xs text-[var(--color-neutral-500)]">
          Notes
        </label>
        <textarea
          id="review-notes"
          name="notes"
          defaultValue={review?.notes ?? ""}
          rows={3}
          placeholder="Anything else worth remembering"
          disabled={isPending}
          className={FIELD_CLASS}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 w-fit rounded-[4px] border border-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] disabled:opacity-50"
      >
        Save review
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
