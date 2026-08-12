/**
 * Shared text input/select/textarea styling — was copy-pasted (some of it
 * byte-for-byte identical, some as ad hoc inline variants) across 10+
 * widget forms before this existed. Matches `glassClass()`'s own
 * plain-string-constant shape rather than a wrapping component, since
 * call sites vary too much in element type (`input`/`select`/`textarea`)
 * and props to make one polymorphic component worth it — see
 * docs/DECISIONS.md's 2026-08-12 entry.
 */
export const FIELD_CLASS =
  "min-h-11 rounded-[4px] border border-[var(--color-divider)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--color-neutral-400)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none";
