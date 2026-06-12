import { SPRINT_RULES, scoreSprint, type SprintResult } from '../scoring';
import type { DrillEvent } from '../scoring';
import { REACTION_RULES, scoreReaction } from './reaction';

/**
 * Arena mode rules as data + pure functions (strategy pattern). The game UI
 * is mode-agnostic: it reads these rules for end conditions, prompt pools
 * and scoring. The server reuses the same scoring for validation.
 */

export const ARENA_MODE_SLUGS = [
  'sprint',
  'time-attack',
  'survival',
  'boss-rush',
  'combo-rush',
  'reaction',
] as const;

export type ArenaModeSlug = (typeof ARENA_MODE_SLUGS)[number];

/** All six modes ship rules; 'reaction' renders its own UI on top of them. */
export type PlayableModeSlug = ArenaModeSlug;

export interface ModeRules {
  readonly slug: PlayableModeSlug;
  /** Wall-clock limit, or null for untimed modes. */
  readonly timeLimitMs: number | null;
  /** Wrong answers that end the run, or null for unlimited. */
  readonly maxMisses: number | null;
  /** Run ends after this many answered prompts, or null for unlimited. */
  readonly targetCount: number | null;
  /** Only shortcuts at or above this difficulty appear. */
  readonly minDifficulty: 1 | 2 | 3 | 4 | 5;
  /** Deterministic score from the event timeline (anti-cheat invariant). */
  readonly score: (events: readonly DrillEvent[]) => SprintResult;
}

export const TIME_ATTACK_RULES = {
  targetCount: 20,
  basePoints: 30_000,
  /** Points lost per 10ms of total run time. */
  timeCostDivisor: 10,
  missPenalty: 1_000,
} as const;

/**
 * Time Attack: fixed number of prompts, the clock is the enemy.
 * Score = base − elapsed/10 − 1000·misses, floored at 0.
 */
export function scoreTimeAttack(events: readonly DrillEvent[]): SprintResult {
  const base = scoreSprint(events);
  if (events.length === 0) return { ...base, score: 0 };
  const elapsedMs = events[events.length - 1].answeredAt;
  const misses = base.total - base.correct;
  const score = Math.max(
    0,
    TIME_ATTACK_RULES.basePoints -
      Math.round(elapsedMs / TIME_ATTACK_RULES.timeCostDivisor) -
      TIME_ATTACK_RULES.missPenalty * misses,
  );
  return { ...base, score };
}

export const MODES: Record<PlayableModeSlug, ModeRules> = {
  sprint: {
    slug: 'sprint',
    timeLimitMs: SPRINT_RULES.durationMs,
    maxMisses: null,
    targetCount: null,
    minDifficulty: 1,
    score: scoreSprint,
  },
  'time-attack': {
    slug: 'time-attack',
    timeLimitMs: null,
    maxMisses: null,
    targetCount: TIME_ATTACK_RULES.targetCount,
    minDifficulty: 1,
    score: scoreTimeAttack,
  },
  survival: {
    slug: 'survival',
    timeLimitMs: null,
    maxMisses: 3,
    targetCount: null,
    minDifficulty: 1,
    score: scoreSprint,
  },
  'boss-rush': {
    slug: 'boss-rush',
    timeLimitMs: null,
    maxMisses: 3,
    targetCount: 15,
    minDifficulty: 3,
    score: scoreSprint,
  },
  'combo-rush': {
    slug: 'combo-rush',
    timeLimitMs: null,
    maxMisses: 1,
    targetCount: null,
    minDifficulty: 1,
    score: scoreSprint,
  },
  reaction: {
    slug: 'reaction',
    timeLimitMs: null,
    maxMisses: null,
    // Clean rounds plus a sane allowance of false starts.
    targetCount: REACTION_RULES.rounds * 3,
    minDifficulty: 1,
    score: scoreReaction,
  },
};

export function getMode(slug: string): ModeRules | undefined {
  return (MODES as Record<string, ModeRules>)[slug];
}

/** True once the timeline (and clock, for timed modes) ends the run. */
export function isRunOver(
  rules: ModeRules,
  events: readonly DrillEvent[],
  elapsedMs: number,
): boolean {
  if (rules.timeLimitMs !== null && elapsedMs >= rules.timeLimitMs) return true;
  if (rules.maxMisses !== null) {
    const misses = events.filter((e) => !e.correct).length;
    if (misses >= rules.maxMisses) return true;
  }
  if (rules.targetCount !== null && events.length >= rules.targetCount) return true;
  return false;
}

/** Lives remaining for HUD display (null when the mode has no lives). */
export function livesLeft(rules: ModeRules, events: readonly DrillEvent[]): number | null {
  if (rules.maxMisses === null) return null;
  const misses = events.filter((e) => !e.correct).length;
  return Math.max(0, rules.maxMisses - misses);
}
