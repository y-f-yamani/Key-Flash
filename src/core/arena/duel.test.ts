import { describe, expect, it } from 'vitest';
import { INITIAL_RATING } from '../rating';
import type { ShortcutDefinition } from '../content';
import { DUEL_RULES, duelOutcome, duelPool, expectedPromptIds } from './duel';

const pool = ['a', 'b', 'c', 'd', 'e'].map(
  (id) =>
    ({
      id: `win11.${id}`,
      keys: [],
      name: { en: id, ar: id },
      description: { en: id, ar: id },
      categoryId: 'x',
      difficulty: 1,
      capturable: 'partial',
    }) as unknown as ShortcutDefinition,
);

describe('expectedPromptIds', () => {
  it('is deterministic per seed — the fairness invariant', () => {
    expect(expectedPromptIds(12345, pool, 30)).toEqual(expectedPromptIds(12345, pool, 30));
    expect(expectedPromptIds(1, pool, 30)).not.toEqual(expectedPromptIds(2, pool, 30));
  });

  it('a longer sequence extends the shorter one (server verifies prefixes)', () => {
    const short = expectedPromptIds(99, pool, 10);
    const long = expectedPromptIds(99, pool, 25);
    expect(long.slice(0, 10)).toEqual(short);
  });

  it('never repeats a prompt back-to-back', () => {
    const ids = expectedPromptIds(7, pool, 100);
    for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
  });
});

describe('duelPool', () => {
  it('excludes non-capturable shortcuts', () => {
    const mixed = [...pool, { ...pool[0], id: 'win11.locked', capturable: 'none' } as ShortcutDefinition];
    expect(duelPool(mixed).some((s) => s.id === 'win11.locked')).toBe(false);
  });
});

describe('duelOutcome', () => {
  it('winner gains rating, loser drops, placements set', () => {
    const { a, b } = duelOutcome(
      { score: 5000, rating: INITIAL_RATING },
      { score: 3000, rating: INITIAL_RATING },
    );
    expect(a.placement).toBe(1);
    expect(b.placement).toBe(2);
    expect(a.ratingAfter.rating).toBeGreaterThan(a.ratingBefore.rating);
    expect(b.ratingAfter.rating).toBeLessThan(b.ratingBefore.rating);
    expect(a.xp).toBe(DUEL_RULES.xpWinner);
    expect(b.xp).toBe(DUEL_RULES.xpLoser);
  });

  it('draws split the game score and keep equal placements', () => {
    const { a, b } = duelOutcome(
      { score: 4000, rating: INITIAL_RATING },
      { score: 4000, rating: INITIAL_RATING },
    );
    expect(a.placement).toBe(1);
    expect(b.placement).toBe(1);
    expect(a.gameScore).toBe(0.5);
    // Equal ratings drawing: ratings barely move.
    expect(Math.abs(a.ratingAfter.rating - 1500)).toBeLessThan(1);
  });

  it('an underdog win moves ratings more than a favorite win', () => {
    const underdog = { score: 9000, rating: { rating: 1300, rd: 100, volatility: 0.06 } };
    const favorite = { score: 1000, rating: { rating: 1700, rd: 100, volatility: 0.06 } };
    const upset = duelOutcome(underdog, favorite);
    expect(upset.a.ratingAfter.rating - 1300).toBeGreaterThan(15);
    expect(1700 - upset.b.ratingAfter.rating).toBeGreaterThan(15);
  });
});
