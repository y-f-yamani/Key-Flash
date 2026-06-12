/**
 * Performance statistics over drill timelines. All functions are pure and
 * deterministic — the server re-runs the same code over submitted timelines
 * to validate client-reported scores (see docs/06-api-design.md).
 */

export interface DrillEvent {
  readonly shortcutId: string;
  /** ms offset from run start when the prompt appeared. */
  readonly promptAt: number;
  /** ms offset from run start when the user answered. */
  readonly answeredAt: number;
  readonly correct: boolean;
}

export function reactionMs(event: DrillEvent): number {
  return event.answeredAt - event.promptAt;
}

export function accuracy(events: readonly DrillEvent[]): number {
  if (events.length === 0) return 0;
  return events.filter((e) => e.correct).length / events.length;
}

export function meanReactionMs(events: readonly DrillEvent[]): number {
  const correct = events.filter((e) => e.correct);
  if (correct.length === 0) return 0;
  return correct.reduce((sum, e) => sum + reactionMs(e), 0) / correct.length;
}

/**
 * Consistency in 0..1 — how steady reaction times are across the run.
 * 1 = perfectly even pace. Derived from the coefficient of variation of
 * correct-answer reaction times (Monkeytype uses the same idea for typing).
 */
export function consistency(events: readonly DrillEvent[]): number {
  const times = events.filter((e) => e.correct).map(reactionMs);
  if (times.length < 2) return times.length === 1 ? 1 : 0;
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  if (mean === 0) return 0;
  const variance = times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / times.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(1, 1 - cv));
}

/** Longest run of consecutive correct answers. */
export function maxCombo(events: readonly DrillEvent[]): number {
  let best = 0;
  let run = 0;
  for (const e of events) {
    run = e.correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
