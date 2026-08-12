import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Memory } from "@pulse/database";
import { listMemories } from "@pulse/database";
import { ACCENT_BADGE, EmptyState, RADIUS } from "@pulse/ui";
import { HERO_TIME_ZONE } from "@pulse/widget-hero";
import { auth } from "@/auth";
import { groupMemoriesByRecency } from "@/lib/group-memories";
import { isExternalHref, memoryHref, MEMORY_SOURCE_META } from "@/lib/memory-sources";

export const metadata: Metadata = { title: "Timeline" };

// timeZone: without it, this renders in the server's own timezone
// (UTC on Vercel) instead of the reference timezone the rest of the
// app uses for "now" — see HERO_TIME_ZONE.
const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: HERO_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: HERO_TIME_ZONE,
  month: "short",
  day: "numeric",
});

const ROW_HOVER =
  "-mx-2 rounded-[4px] px-2 transition-colors hover:bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)]";

function MemoryRow({ memory }: { memory: Memory }) {
  const meta = MEMORY_SOURCE_META[memory.source];
  const createdAt = new Date(memory.createdAt);

  const content = (
    <>
      {meta && (
        <span
          aria-hidden="true"
          title={meta.label}
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center ${RADIUS.chip} ${ACCENT_BADGE}`}
        >
          <span className="flex h-3.5 w-3.5 items-center justify-center">{meta.icon}</span>
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-medium text-[var(--foreground)]">
            {memory.title}
          </span>
          <span className="shrink-0 text-xs text-[var(--color-neutral-400)]">
            {DATE_FORMAT.format(createdAt)} · {TIME_FORMAT.format(createdAt)}
          </span>
        </div>
        {memory.description && (
          <span className="text-sm text-[var(--color-neutral-600)]">{memory.description}</span>
        )}
        {meta && (
          <span className="text-[11px] tracking-wide text-[var(--color-neutral-400)]">
            {meta.label}
          </span>
        )}
      </div>
    </>
  );

  const href = memoryHref(memory.source, memory.metadata);
  const rowClass = `flex items-start gap-3 py-3 ${href ? ROW_HOVER : ""}`;

  if (href && isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={rowClass}>
        {content}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {content}
      </Link>
    );
  }
  return <div className={rowClass}>{content}</div>;
}

export default async function TimelinePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const memories = await listMemories(session.user.id);
  const groups = groupMemoriesByRecency(memories);

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">
        Timeline
      </h1>

      {groups.length === 0 ? (
        <EmptyState message="No memories yet — they'll show up here as widgets detect meaningful changes." />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-3">
              <h2 className="font-heading text-sm font-semibold tracking-[0.08em] text-[var(--color-accent-700)] uppercase">
                {group.label} · {group.memories.length}
              </h2>
              <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
                {group.memories.map((memory) => (
                  <MemoryRow key={memory.id} memory={memory} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
