import { CalendarClock, CloudSun, Quote as QuoteIcon } from "lucide-react";
import { glassClass, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { HeroClock } from "./hero-clock";
import type { HeroData } from "./types";

const chipClass = `flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 ${glassClass("light")}`;

/**
 * The dashboard's hero section — one grouped glass panel, not floating
 * text blocks. Greeting up top establishes the reading flow's starting
 * point; "today at a glance" chips (date/time, weather, quote) sit
 * together in a row underneath, each its own small glass surface so the
 * three concerns read as related but distinct.
 */
export function HeroComponent({
  data,
  actions,
}: WidgetRenderProps<HeroData, Record<string, unknown>>) {
  return (
    <section
      className={`flex flex-col gap-6 rounded-[32px] p-6 sm:p-8 ${glassClass("medium")}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
            {data?.greeting ?? "Hello"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">Continue where you left off.</p>
        </div>
        <WidgetMenu id="hero" actions={actions} />
      </div>

      {data && (
        <div className="flex flex-wrap gap-3">
          <div className={chipClass}>
            <CalendarClock
              className="h-4.5 w-4.5 shrink-0 text-violet-500 dark:text-violet-300"
              aria-hidden="true"
            />
            <div>
              <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-500">
                Today
              </p>
              <p className="text-sm text-zinc-800 dark:text-zinc-200">
                {data.dateFormatted} · <HeroClock />
              </p>
            </div>
          </div>

          <div className={chipClass}>
            <CloudSun
              className="h-4.5 w-4.5 shrink-0 text-sky-500 dark:text-sky-300"
              aria-hidden="true"
            />
            <div>
              <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-500">
                Weather
              </p>
              <p className="text-sm text-zinc-800 dark:text-zinc-200">
                {data.weatherSummary} in {data.weatherLocation}
              </p>
            </div>
          </div>

          <div className={`${chipClass} basis-full sm:basis-auto`}>
            <QuoteIcon
              className="h-4.5 w-4.5 shrink-0 text-amber-500 dark:text-amber-300"
              aria-hidden="true"
            />
            <p className="text-sm text-zinc-800 italic dark:text-zinc-200">&ldquo;{data.quote}&rdquo;</p>
          </div>
        </div>
      )}
    </section>
  );
}
