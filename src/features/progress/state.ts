import { gradeFromDrill, isDue, newCardState, review } from '@/core/srs';
import { XP_REWARDS, recordActivity } from '@/core/gamification';
import type { SprintResult } from '@/core/scoring';
import type { Difficulty } from '@/core/content';
import type { CardRecord, DrillOutcome, PersonalBest, PlayerState } from './types';

/**
 * Pure state transitions for player progress. The provider is a thin React
 * wrapper around these functions, which keeps every rule unit-testable.
 */

function awardXp(state: PlayerState, amount: number, dateKey: string): PlayerState {
  const sameDay = state.today.dateKey === dateKey;
  return {
    ...state,
    totalXp: state.totalXp + amount,
    streak: recordActivity(state.streak, dateKey),
    today: { dateKey, xp: (sameDay ? state.today.xp : 0) + amount },
  };
}

function emptyCard(now: number): CardRecord {
  return { ...newCardState(now), attempts: 0, correct: 0, bestMs: null, avgMs: null };
}

export function applyDrill(
  state: PlayerState,
  drill: DrillOutcome,
  difficulty: Difficulty,
  now: number,
  dateKey: string,
): PlayerState {
  const previous = state.cards[drill.shortcutId] ?? emptyCard(now);
  const grade = gradeFromDrill({ correct: drill.correct, reactionMs: drill.reactionMs, difficulty });
  const reviewed = review(previous, grade, now);

  const correctCount = previous.correct + (drill.correct ? 1 : 0);
  const card: CardRecord = {
    ...reviewed,
    attempts: previous.attempts + 1,
    correct: correctCount,
    bestMs: drill.correct
      ? Math.min(previous.bestMs ?? Infinity, drill.reactionMs)
      : previous.bestMs,
    avgMs: drill.correct
      ? Math.round(((previous.avgMs ?? drill.reactionMs) * (correctCount - 1) + drill.reactionMs) / correctCount)
      : previous.avgMs,
  };

  const xp = drill.correct
    ? grade === 'easy'
      ? XP_REWARDS.drillCorrectFast
      : XP_REWARDS.drillCorrect
    : 0;

  const next = { ...state, cards: { ...state.cards, [drill.shortcutId]: card } };
  return xp > 0 ? awardXp(next, xp, dateKey) : next;
}

export function applyLessonComplete(state: PlayerState, dateKey: string): PlayerState {
  return awardXp(state, XP_REWARDS.lessonCompleted, dateKey);
}

export function applySprintResult(
  state: PlayerState,
  mode: string,
  result: SprintResult,
  now: number,
  dateKey: string,
): { state: PlayerState; isRecord: boolean; xpEarned: number } {
  const previous = state.bests[mode];
  const isRecord = !previous || result.score > previous.score;
  const xpEarned = XP_REWARDS.sprintRun + Math.round(result.score / 100);

  const best: PersonalBest = isRecord ? { ...result, achievedAt: now } : previous;
  const next = awardXp(
    { ...state, bests: { ...state.bests, [mode]: best } },
    xpEarned,
    dateKey,
  );
  return { state: next, isRecord, xpEarned };
}

/** Shortcut ids that are due for review, oldest due first. */
export function dueShortcutIds(state: PlayerState, now: number): string[] {
  return Object.entries(state.cards)
    .filter(([, card]) => isDue(card, now))
    .sort(([, a], [, b]) => a.dueAt - b.dueAt)
    .map(([id]) => id);
}

/**
 * Mastery for a set of shortcuts in 0..1. A shortcut counts as mastered in
 * proportion to its SRS interval, saturating at 21 days — "I will still know
 * this in three weeks" is our definition of learned.
 */
export function mastery(state: PlayerState, shortcutIds: readonly string[]): number {
  if (shortcutIds.length === 0) return 0;
  const saturationDays = 21;
  const sum = shortcutIds.reduce((acc, id) => {
    const card = state.cards[id];
    if (!card) return acc;
    return acc + Math.min(1, card.intervalDays / saturationDays);
  }, 0);
  return sum / shortcutIds.length;
}
