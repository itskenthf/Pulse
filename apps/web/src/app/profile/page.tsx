import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { glassClass, RADIUS } from "@pulse/ui";
import { auth } from "@/auth";

/**
 * Deliberately minimal — just the identity the profile menu already
 * showed, now on its own page as a real destination for that menu's
 * clickable name/email block. Preferences/Appearance/Connected Services/
 * API Keys are a later addition (Ken's own phrasing) — building them now
 * would be scaffolding ahead of need, not what was actually asked for.
 */
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const { name, email, image } = session.user;
  const label = name ?? email ?? "Account";

  return (
    <div className="relative flex min-h-screen bg-[var(--background)]">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--color-neutral-600)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
        </Link>

        <div
          className={`flex flex-col items-center gap-4 ${RADIUS.card} p-8 text-center ${glassClass("light")}`}
        >
          {image ? (
            // Plain <img>: external GitHub avatar URL, tiny fixed size —
            // not worth routing through next/image's optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-full border border-[var(--color-divider)]"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-accent-300)] bg-[var(--color-accent-100)] font-heading text-2xl font-semibold text-[var(--color-accent-700)]">
              {label.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-xl font-semibold text-[var(--foreground)]">
              {name ?? "Account"}
            </h1>
            {email && <p className="text-sm text-[var(--color-neutral-500)]">{email}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
