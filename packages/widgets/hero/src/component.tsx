import { Sparkles } from "lucide-react";
import { RADIUS } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { QuoteButton } from "./quote-button";
import type { HeroData } from "./types";

const HEADING_ID = "hero-heading";

/**
 * A flowing assistant line, not a stats row: date/time and weather (plus
 * a deterministic, rule-based tip when conditions warrant one — see
 * weather-tip.ts) read as one sentence instead of separate glass chips.
 * Less "informative dashboard," more "someone briefing you on the day."
 *
 * `aria-labelledby` uses a static id, not `useId()` — the widget SDK's
 * `render()` is invoked as a bare function call (`widget.render(props)` in
 * apps/web's WidgetSlot) after an `await`, not through JSX, so React's hook
 * dispatcher isn't reliably active here; calling a hook throws in
 * production (caught by WidgetErrorBoundary, invisible to `pnpm build`
 * since the dashboard route is dynamic/auth-gated and never prerendered).
 * A static id is safe since Hero is a singleton (`size: "hero"`, at most
 * one instance ever rendered) — see docs/DECISIONS.md.
 *
 * Deliberately renders no WidgetMenu: Hero has no settings, so its menu
 * held only a Refresh action that the global "Pulse" title refresh
 * (apps/web/src/app/refresh-all-title.tsx) already covers. Every other
 * widget keeps its own "⋯" menu for refreshing that one card alone. The
 * quote itself is a click target instead, via `actions.cycleQuote` (see
 * quote-button.tsx and cycle-quote.ts).
 */
export function HeroComponent({
  data,
  actions,
}: WidgetRenderProps<HeroData, Record<string, unknown>>) {
  return (
    <section aria-labelledby={HEADING_ID} className={`flex flex-col gap-5 ${RADIUS.hero}`}>
      <div className="flex flex-col gap-2">
        {data?.dateFormatted && (
          <p className="text-xs tracking-[0.08em] text-[var(--color-accent-700)] uppercase">
            {data.dateFormatted}
          </p>
        )}
        <h1
          id={HEADING_ID}
          className="font-heading text-3xl font-normal tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl"
        >
          {data?.greeting ?? "Hello"}
        </h1>
      </div>

      {data && (
        <div className="flex flex-col gap-3">
          <p className="max-w-2xl text-base leading-relaxed text-[var(--foreground)] sm:text-lg sm:text-justify">
            {data.weatherSummary} in {data.weatherLocation}
            {data.weatherTip ? ` — ${data.weatherTip}` : "."}
          </p>

          {actions.cycleQuote ? (
            <QuoteButton quote={data.quote} cycleAction={actions.cycleQuote} />
          ) : (
            <div className="flex items-start gap-2 text-sm text-[var(--color-neutral-600)] italic">
              <Sparkles
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]"
                aria-hidden="true"
              />
              <p>&ldquo;{data.quote}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
