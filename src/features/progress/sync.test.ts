import { describe, expect, it } from 'vitest';
import { changedCardIds, mergeStates } from './sync';
import { INITIAL_PLAYER_STATE, type CardRecord, type PersonalBest, type PlayerState } from './types';

function card(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    ease: 2.5,
    intervalDays: 3,
    dueAt: 1_000,
    reps: 2,
    lapses: 0,
    attempts: 5,
    correct: 4,
    bestMs: 500,
    avgMs: 700,
    ...overrides,
  };
}

function best(score: number): PersonalBest {
  return {
    score,
    accuracy: 0.9,
    avgReactionMs: 500,
    consistency: 0.8,
    maxCombo: 5,
    correct: 10,
    total: 11,
    achievedAt: 1_000,
  };
}

function state(overrides: Partial<PlayerState>): PlayerState {
  return { ...INITIAL_PLAYER_STATE, ...overrides };
}

describe('mergeStates', () => {
  it('never loses XP and keeps the longest streak ever', () => {
    const local = state({
      totalXp: 500,
      streak: { current: 3, longest: 8, lastActiveDate: '2026-06-11' },
    });
    const cloud = state({
      totalXp: 800,
      streak: { current: 1, longest: 5, lastActiveDate: '2026-06-01' },
    });
    const merged = mergeStates(local, cloud);
    expect(merged.totalXp).toBe(800);
    expect(merged.streak.current).toBe(3); // local streak is stronger
    expect(merged.streak.longest).toBe(8);
  });

  it('unions cards, preferring the more-learned copy per shortcut', () => {
    const local = state({
      cards: {
        a: card({ reps: 5, intervalDays: 10 }),
        b: card({ reps: 1, bestMs: 300 }),
        onlyLocal: card(),
      },
    });
    const cloud = state({
      cards: {
        a: card({ reps: 2, intervalDays: 20 }),
        b: card({ reps: 4, bestMs: 450 }),
        onlyCloud: card(),
      },
    });
    const merged = mergeStates(local, cloud);
    expect(Object.keys(merged.cards).sort()).toEqual(['a', 'b', 'onlyCloud', 'onlyLocal']);
    expect(merged.cards['a'].reps).toBe(5); // more reps wins
    expect(merged.cards['b'].reps).toBe(4);
    expect(merged.cards['b'].bestMs).toBe(300); // best time survives either side
  });

  it('keeps the higher personal best per mode', () => {
    const local = state({ bests: { sprint: best(4000) } });
    const cloud = state({ bests: { sprint: best(6000), survival: best(100) } });
    const merged = mergeStates(local, cloud);
    expect(merged.bests['sprint'].score).toBe(6000);
    expect(merged.bests['survival'].score).toBe(100);
  });

  it('prefers the newer daily-XP bucket', () => {
    const local = state({ today: { dateKey: '2026-06-12', xp: 40 } });
    const cloud = state({ today: { dateKey: '2026-06-10', xp: 90 } });
    expect(mergeStates(local, cloud).today).toEqual({ dateKey: '2026-06-12', xp: 40 });
  });
});

describe('changedCardIds', () => {
  it('returns only cards whose reference changed', () => {
    const shared = card();
    const previous = state({ cards: { a: shared, b: card() } });
    const next = state({ cards: { a: shared, b: card({ reps: 9 }), c: card() } });
    expect(changedCardIds(previous, next).sort()).toEqual(['b', 'c']);
  });

  it('is empty when nothing changed', () => {
    const s = state({ cards: { a: card() } });
    expect(changedCardIds(s, s)).toEqual([]);
  });
});
