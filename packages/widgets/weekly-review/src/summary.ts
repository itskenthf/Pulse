const RATING_WORDS: Record<number, string> = {
  1: "low",
  2: "below average",
  3: "steady",
  4: "good",
  5: "great",
};

function ratingWord(rating: number | null): string | null {
  return rating !== null ? (RATING_WORDS[rating] ?? null) : null;
}

export interface WeeklySummaryInput {
  mood: number | null;
  energy: number | null;
  confidence: number | null;
  sleepQuality: number | null;
  biggestAchievement: string | null;
  biggestStruggle: string | null;
}

/**
 * Deterministic, rule-based — no LLM call, no external cost, same "no AI
 * assistant" preference behind Hero's weather-tip.ts. Builds a short
 * sentence from whatever ratings/notes were actually filled in; a field
 * left blank is simply omitted rather than forcing a placeholder into
 * the text.
 */
export function generateWeeklySummary(input: WeeklySummaryInput): string {
  const clauses: string[] = [];

  const moodWord = ratingWord(input.mood);
  const energyWord = ratingWord(input.energy);
  if (moodWord && energyWord) {
    clauses.push(`Mood was ${moodWord} this week, with ${energyWord} energy`);
  } else if (moodWord) {
    clauses.push(`Mood was ${moodWord} this week`);
  } else if (energyWord) {
    clauses.push(`Energy was ${energyWord} this week`);
  }

  const confidenceWord = ratingWord(input.confidence);
  if (confidenceWord) clauses.push(`confidence was ${confidenceWord}`);

  const sleepWord = ratingWord(input.sleepQuality);
  if (sleepWord) clauses.push(`sleep quality was ${sleepWord}`);

  let summary = clauses.length > 0 ? `${clauses.join(", ")}.` : "";

  if (input.biggestAchievement) {
    summary += `${summary ? " " : ""}Biggest win: ${input.biggestAchievement}.`;
  }
  if (input.biggestStruggle) {
    summary += `${summary ? " " : ""}Biggest struggle: ${input.biggestStruggle}.`;
  }

  return summary || "No review filled in yet this week.";
}
