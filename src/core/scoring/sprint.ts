import { accuracy, consistency, maxCombo, meanReactionMs, reactionMs, type DrillEvent } from './stats';

/**
 * Scoring rules for the Shortcut Sprint arena mode.
 *
 * Design goals: reward speed without making accuracy optional, make combos
 * feel exciting (Chess.com puzzle-rush energy), and stay deterministic so the
 * same timeline always yields the same score on client and server.
 */

export const SPRINT_RULES = {
  durationMs: 60_000,
  basePoints: 100,
  /** Full speed bonus at/below this reaction time. */
  fastestMs: 300,
  /** No speed bonus at/above this reaction time. */
  slowestMs: 3_000,
  maxSpeedBonus: 100,
  /** Combo multiplier grows +10% per consecutive correct answer, capped at 2x. */
  comboStep: 0.1,
  comboCap: 2,
} as const;

export interface SprintResult {
  score: number;
  accuracy: number;
  avgReactionMs: number;
  consistency: number;
  maxCombo: number;
  correct: number;
  total: number;
}

/** Points for a single correct answer given the current combo length (1-based). */
export function pointsForAnswer(reactionTimeMs: number, comboLength: number): number {
  const { basePoints, fastestMs, slowestMs, maxSpeedBonus, comboStep, comboCap } = SPRINT_RULES;
  const clamped = Math.min(Math.max(reactionTimeMs, fastestMs), slowestMs);
  const speedFraction = (slowestMs - clamped) / (slowestMs - fastestMs);
  const speedBonus = Math.round(maxSpeedBonus * speedFraction);
  const multiplier = Math.min(comboCap, 1 + comboStep * (comboLength - 1));
  return Math.round((basePoints + speedBonus) * multiplier);
}

/** Scores a full run from its event timeline. Deterministic. */
export function scoreSprint(events: readonly DrillEvent[]): SprintResult {
  let score = 0;
  let combo = 0;
  for (const event of events) {
    if (event.correct) {
      combo += 1;
      score += pointsForAnswer(reactionMs(event), combo);
    } else {
      combo = 0;
    }
  }
  return {
    score,
    accuracy: accuracy(events),
    avgReactionMs: Math.round(meanReactionMs(events)),
    consistency: consistency(events),
    maxCombo: maxCombo(events),
    correct: events.filter((e) => e.correct).length,
    total: events.length,
  };
}
