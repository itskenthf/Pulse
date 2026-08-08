/**
 * Distributes items across priority tiers so a prolific tier can't
 * crowd out lower-priority ones entirely — each tier gets an even soft
 * cap first (maxItems / tier count, rounded up), then any capacity a
 * tier didn't use gets handed to higher-priority tiers first. Output
 * stays grouped by tier (all of tier 1's picks, then tier 2's, …) —
 * this only decides how many slots each tier gets, not interleaving.
 */
export function mixByPriority<T>(tiers: T[][], maxItems: number): T[] {
  if (tiers.length === 0 || maxItems <= 0) return [];

  const softCap = Math.ceil(maxItems / tiers.length);
  const allocated = tiers.map((tier) => Math.min(tier.length, softCap));
  let remaining = maxItems - allocated.reduce((sum, count) => sum + count, 0);

  for (let i = 0; i < tiers.length && remaining > 0; i++) {
    const extra = Math.min(tiers[i]!.length - allocated[i]!, remaining);
    if (extra > 0) {
      allocated[i]! += extra;
      remaining -= extra;
    }
  }

  return tiers.flatMap((tier, i) => tier.slice(0, allocated[i]!));
}
