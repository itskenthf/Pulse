import { Sparkles } from "lucide-react";
import { glassClass, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { HeroClock } from "./hero-clock";
import type { HeroData } from "./types";

/**
 * A flowing assistant line, not a stats row: date/time and weather (plus
 * a deterministic, rule-based tip when conditions warrant one — see
 * weather-tip.ts) read as one sentence instead of separate glass chips.
 * Less "informative dashboard," more "someone briefing you on the day."
 */
export function HeroComponent({
  data,
  actions,
}: WidgetRenderProps<HeroData, Record<string, unknown>>) {
  return (
    <section className={`flex flex-col gap-5 rounded-[32px] p-6 sm:p-8 ${glassClass("medium")}`}>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
          {data?.greeting ?? "Hello"}
        </h1>
        <WidgetMenu id="hero" actions={actions} />
      </div>

      {data && (
        <div className="flex flex-col gap-3">
          <p className="max-w-2xl text-base leading-relaxed text-zinc-700 sm:text-lg dark:text-zinc-300">
            It&apos;s {data.dateFormatted}, <HeroClock />. {data.weatherSummary} in{" "}
            {data.weatherLocation}
            {data.weatherTip ? ` — ${data.weatherTip}` : "."}
          </p>

          <div className="flex items-start gap-2 text-sm text-zinc-500 italic dark:text-zinc-500">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-300" aria-hidden="true" />
            <p>&ldquo;{data.quote}&rdquo;</p>
          </div>
        </div>
      )}
    </section>
  );
}
