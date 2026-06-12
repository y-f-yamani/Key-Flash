import type { CardState } from '@/core/srs';
import type { StreakState } from '@/core/gamification';
import type { SprintResult } from '@/core/scoring';

/** SRS state plus lifetime performance for one shortcut. */
export interface CardRecord extends CardState {
  readonly attempts: number;
  readonly correct: number;
  readonly bestMs: number | null;
  readonly avgMs: number | null;
}

export interface PersonalBest extends SprintResult {
  readonly achievedAt: number;
}

/**
 * Everything the platform persists per player. Stored locally first
 * (ADR-0005); synced to Supabase after sign-in in Phase 2.
 */
export interface PlayerState {
  readonly version: 1;
  readonly totalXp: number;
  readonly streak: StreakState;
  readonly dailyGoalXp: number;
  /** XP earned on the current date key; resets when the day changes. */
  readonly today: { readonly dateKey: string; readonly xp: number };
  readonly cards: Readonly<Record<string, CardRecord>>;
  /** Personal bests keyed by arena mode. */
  readonly bests: Readonly<Record<string, PersonalBest>>;
}

export const INITIAL_PLAYER_STATE: PlayerState = {
  version: 1,
  totalXp: 0,
  streak: { current: 0, longest: 0, lastActiveDate: null },
  dailyGoalXp: 50,
  today: { dateKey: '', xp: 0 },
  cards: {},
  bests: {},
};

export interface DrillOutcome {
  readonly shortcutId: string;
  readonly correct: boolean;
  readonly reactionMs: number;
}
