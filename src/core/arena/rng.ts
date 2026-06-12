/**
 * Deterministic PRNG (mulberry32) for arena prompt generation. Seeded runs
 * make tests reproducible and are the basis for fair 1v1 matches later:
 * both players receive identical prompt sequences from a shared seed.
 */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks the next prompt, never repeating the previous one back-to-back. */
export function pickPrompt<T extends { id: string }>(
  pool: readonly T[],
  rng: Rng,
  previousId: string | null,
): T {
  if (pool.length === 0) throw new Error('pickPrompt requires a non-empty pool');
  if (pool.length === 1) return pool[0];
  const candidates = previousId === null ? pool : pool.filter((item) => item.id !== previousId);
  return candidates[Math.floor(rng() * candidates.length)];
}
