import type { ShortcutDefinition } from '../content';
import { updateRating, type Rating } from '../rating';
import { createRng, pickPrompt } from './rng';

/**
 * 1v1 ranked duel rules. Both players receive the IDENTICAL prompt sequence
 * derived from the match seed — fairness and anti-cheat hang on this file
 * being deterministic, so it is pure and exhaustively tested.
 */
export const DUEL_RULES = {
  durationMs: 45_000,
  /** Grace after the clock before an unsubmitted opponent forfeits. */
  forfeitGraceMs: 30_000,
  xpWinner: 60,
  xpLoser: 20,
} as const;

/** The duel prompt pool: every capturable shortcut, in stable catalog order. */
export function duelPool(shortcuts: readonly ShortcutDefinition[]): ShortcutDefinition[] {
  return shortcuts.filter((s) => s.capturable !== 'none');
}

/**
 * First `count` prompt ids for a seed — both clients AND the server generate
 * this same sequence; the server rejects timelines that answered anything else.
 */
export function expectedPromptIds(
  seed: number,
  pool: readonly ShortcutDefinition[],
  count: number,
): string[] {
  const rng = createRng(seed);
  const ids: string[] = [];
  let previous: string | null = null;
  for (let i = 0; i < count; i++) {
    const prompt: ShortcutDefinition = pickPrompt(pool, rng, previous);
    ids.push(prompt.id);
    previous = prompt.id;
  }
  return ids;
}

export interface DuelPlayerOutcome {
  /** 1 = winner, 2 = loser; both 1 on a draw. */
  placement: number;
  /** Glicko-2 game score: 1 win, 0.5 draw, 0 loss. */
  gameScore: 0 | 0.5 | 1;
  ratingBefore: Rating;
  ratingAfter: Rating;
  xp: number;
}

/**
 * Resolves a finished duel: placements from validated scores, Glicko-2
 * updates for both sides. Pure — the API route persists the result.
 */
export function duelOutcome(
  a: { score: number; rating: Rating },
  b: { score: number; rating: Rating },
): { a: DuelPlayerOutcome; b: DuelPlayerOutcome } {
  const scoreA: 0 | 0.5 | 1 = a.score > b.score ? 1 : a.score < b.score ? 0 : 0.5;
  const scoreB: 0 | 0.5 | 1 = scoreA === 1 ? 0 : scoreA === 0 ? 1 : 0.5;

  return {
    a: {
      placement: scoreA === 0 ? 2 : 1,
      gameScore: scoreA,
      ratingBefore: a.rating,
      ratingAfter: updateRating(a.rating, [{ opponent: b.rating, score: scoreA }]),
      xp: scoreA === 1 ? DUEL_RULES.xpWinner : DUEL_RULES.xpLoser,
    },
    b: {
      placement: scoreB === 0 ? 2 : 1,
      gameScore: scoreB,
      ratingBefore: b.rating,
      ratingAfter: updateRating(b.rating, [{ opponent: a.rating, score: scoreB }]),
      xp: scoreB === 1 ? DUEL_RULES.xpWinner : DUEL_RULES.xpLoser,
    },
  };
}
