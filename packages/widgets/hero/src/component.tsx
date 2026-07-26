import { Sparkles } from "lucide-react";
import { useId } from "react";
import { RADIUS, WidgetMenu } from "@pulse/ui";
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
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={`flex flex-col gap-5 border-b border-[var(--color-divider)] pb-6 sm:pb-8 ${RADIUS.hero}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h1
          id={headingId}
          className="font-heading text-4xl font-normal tracking-tight text-[var(--foreground)] sm:text-5xl"
        >
          {data?.greeting ?? "Hello"}
        </h1>
        <WidgetMenu id="hero" actions={actions} />
      </div>

      {data && (
        <div className="flex flex-col gap-3">
          <p className="max-w-2xl text-base leading-relaxed text-[var(--foreground)] sm:text-lg sm:text-justify">
            It&apos;s {data.dateFormatted}, <HeroClock />. {data.weatherSummary} in{" "}
            {data.weatherLocation}
            {data.weatherTip ? ` — ${data.weatherTip}` : "."}
          </p>

          <div className="flex items-start gap-2 text-sm text-[var(--color-neutral-600)] italic">
            <Sparkles
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <p>&ldquo;{data.quote}&rdquo;</p>
          </div>
        </div>
      )}
    </section>
  );
}
