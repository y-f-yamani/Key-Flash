import { consistency, maxCombo, type DrillEvent } from '../scoring/stats';
import type { SprintResult } from '../scoring/sprint';
import type { Rng } from './rng';

/**
 * Reaction Test rules (Human Benchmark-style): wait for the green signal,
 * press as fast as humanly possible. Pressing early is a false start — the
 * round repeats. Five clean rounds make a run.
 *
 * Timeline encoding reuses DrillEvent: a clean round is `correct: true` with
 * promptAt = the green flash and answeredAt = the press; a false start is
 * `correct: false` (promptAt = answeredAt - 1 since there was no signal yet).
 */
export const REACTION_RULES = {
  rounds: 5,
  minDelayMs: 1_500,
  maxDelayMs: 4_000,
  /** Score formula floor/scale: 1000 points at 0ms, 0 at ≥1000ms average. */
  scoreBase: 1_000,
  falseStartPenalty: 50,
} as const;

/** Seeded random wait before the green signal — identical for both players in a duel. */
export function roundDelayMs(rng: Rng): number {
  const { minDelayMs, maxDelayMs } = REACTION_RULES;
  return Math.round(minDelayMs + rng() * (maxDelayMs - minDelayMs));
}

/** Average reaction of the clean rounds, ignoring false starts. */
export function averageReactionMs(events: readonly DrillEvent[]): number {
  const clean = events.filter((e) => e.correct);
  if (clean.length === 0) return 0;
  return clean.reduce((sum, e) => sum + (e.answeredAt - e.promptAt), 0) / clean.length;
}

/**
 * Deterministic score: faster average = more points; every false start costs
 * a flat penalty. Same timeline ⇒ same score, client and server.
 */
export function scoreReaction(events: readonly DrillEvent[]): SprintResult {
  const clean = events.filter((e) => e.correct);
  const falseStarts = events.length - clean.length;
  const avg = averageReactionMs(events);

  const score =
    clean.length === 0
      ? 0
      : Math.max(
          0,
          Math.round(REACTION_RULES.scoreBase - avg) -
            falseStarts * REACTION_RULES.falseStartPenalty,
        );

  return {
    score,
    accuracy: events.length === 0 ? 0 : clean.length / events.length,
    avgReactionMs: Math.round(avg),
    consistency: consistency(events),
    maxCombo: maxCombo(events),
    correct: clean.length,
    total: events.length,
  };
}
