import Link from "next/link";

export interface ViewAllLinkProps {
  href: string;
}

/**
 * The "View all →" footer link every list-preview widget (Tasks, Notes,
 * Notebook, Reading) points at its own full-history page — same text,
 * same styling, independently duplicated in each widget's card component
 * — see docs/DECISIONS.md's 2026-08-12 entry.
 */
export function ViewAllLink({ href }: ViewAllLinkProps) {
  return (
    <Link href={href} className="text-sm font-medium text-[var(--color-accent)] hover:underline">
      View all →
    </Link>
  );
}
