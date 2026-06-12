/**
 * Spaced-repetition scheduler — an SM-2 variant tuned for motor-skill drills.
 *
 * Pure functions over plain data: `(state, grade, now) → state`. No IO, no
 * randomness, no Date.now() — callers supply the clock, tests stay deterministic.
 */

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

export interface CardState {
  /** SM-2 ease factor; never below MIN_EASE. */
  readonly ease: number;
  /** Current inter-review interval in days; 0 for unseen/lapsed cards. */
  readonly intervalDays: number;
  /** Epoch ms when the card becomes due. */
  readonly dueAt: number;
  /** Successful reviews in the current run (resets on lapse). */
  readonly reps: number;
  /** Total number of lapses (failed reviews) ever. */
  readonly lapses: number;
}

export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;

const DAY_MS = 24 * 60 * 60 * 1000;
/** A failed card comes back within the same session. */
const RELEARN_DELAY_MS = 10 * 60 * 1000;
const FIRST_INTERVAL_DAYS = 1;
const SECOND_INTERVAL_DAYS = 3;

export function newCardState(now: number): CardState {
  return { ease: DEFAULT_EASE, intervalDays: 0, dueAt: now, reps: 0, lapses: 0 };
}

export function isDue(state: CardState, now: number): boolean {
  return state.dueAt <= now;
}

/** Applies one review outcome and returns the next state. */
export function review(state: CardState, grade: ReviewGrade, now: number): CardState {
  if (grade === 'again') {
    return {
      ease: clampEase(state.ease - 0.2),
      intervalDays: 0,
      dueAt: now + RELEARN_DELAY_MS,
      reps: 0,
      lapses: state.lapses + 1,
    };
  }

  const ease = clampEase(state.ease + easeDelta(grade));
  const intervalDays = nextInterval(state, grade, ease);
  return {
    ease,
    intervalDays,
    dueAt: now + intervalDays * DAY_MS,
    reps: state.reps + 1,
    lapses: state.lapses,
  };
}

function easeDelta(grade: Exclude<ReviewGrade, 'again'>): number {
  switch (grade) {
    case 'hard':
      return -0.15;
    case 'good':
      return 0;
    case 'easy':
      return 0.15;
  }
}

function nextInterval(state: CardState, grade: Exclude<ReviewGrade, 'again'>, ease: number): number {
  if (state.reps === 0) return FIRST_INTERVAL_DAYS;
  if (state.reps === 1) return grade === 'hard' ? FIRST_INTERVAL_DAYS : SECOND_INTERVAL_DAYS;

  const factor = grade === 'hard' ? 1.2 : grade === 'easy' ? ease * 1.3 : ease;
  // Always make forward progress, even at minimum ease on a 1-day interval.
  return Math.max(state.intervalDays + 1, Math.round(state.intervalDays * factor));
}

function clampEase(ease: number): number {
  return Math.max(MIN_EASE, ease);
}

/**
 * Derives the grade from an objective drill outcome instead of self-reporting
 * (Anki-style buttons measure honesty; we can measure performance directly).
 * Thresholds scale with difficulty so a 5-key chord is not judged like Ctrl+C.
 */
export function gradeFromDrill(input: {
  correct: boolean;
  reactionMs: number;
  difficulty: number; // 1..5
}): ReviewGrade {
  if (!input.correct) return 'again';
  const fastMs = 800 + input.difficulty * 200;
  const okMs = 2500 + input.difficulty * 500;
  if (input.reactionMs <= fastMs) return 'easy';
  if (input.reactionMs <= okMs) return 'good';
  return 'hard';
}
