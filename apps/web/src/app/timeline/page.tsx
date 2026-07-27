import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listMemories } from "@pulse/database";
import { EmptyState } from "@pulse/ui";
import { auth } from "@/auth";
import { groupMemoriesByRecency } from "@/lib/group-memories";

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export default async function TimelinePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const memories = await listMemories(session.user.id);
  const groups = groupMemoriesByRecency(memories);

  return (
    <div className="relative flex min-h-screen bg-[var(--background)]">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--color-neutral-600)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
        </Link>

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
                  {group.label}
                </h2>
                <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
                  {group.memories.map((memory) => (
                    <div key={memory.id} className="flex flex-col gap-0.5 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-[var(--foreground)]">
                          {memory.title}
                        </span>
                        <span className="shrink-0 text-xs text-[var(--color-neutral-400)]">
                          {TIME_FORMAT.format(new Date(memory.createdAt))}
                        </span>
                      </div>
                      {memory.description && (
                        <span className="text-sm text-[var(--color-neutral-600)]">
                          {memory.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
