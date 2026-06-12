import { registry } from '@/content';
import { DUEL_RULES, duelPool, expectedPromptIds } from '@/core/arena';
import { scoreSprint, type DrillEvent, type SprintResult } from '@/core/scoring';
import { REACTION_FLOOR_MS } from '@/features/arena/run-validation';

/**
 * Server-side duel timeline judgement. Stricter than solo runs: a timeline
 * that answers prompts outside the seeded sequence is REJECTED outright —
 * there is no honest way to produce it.
 */
export function verifyDuelTimeline(
  seed: number,
  durationMs: number,
  events: readonly DrillEvent[],
): { ok: true; result: SprintResult } | { ok: false; reason: string } {
  if (durationMs !== DUEL_RULES.durationMs) {
    return { ok: false, reason: 'duration-mismatch' };
  }

  const pool = duelPool(registry.getDomain('win11')?.shortcuts ?? []);
  const expected = expectedPromptIds(seed, pool, events.length);
  for (let i = 0; i < events.length; i++) {
    if (events[i].shortcutId !== expected[i]) {
      return { ok: false, reason: 'sequence-mismatch' };
    }
  }

  let previousAnsweredAt = -1;
  for (const event of events) {
    if (event.answeredAt <= event.promptAt) return { ok: false, reason: 'non-positive-reaction' };
    if (event.promptAt < previousAnsweredAt) return { ok: false, reason: 'overlapping-events' };
    if (event.answeredAt > durationMs + 2_000) return { ok: false, reason: 'event-after-run-end' };
    if (event.correct && event.answeredAt - event.promptAt < REACTION_FLOOR_MS) {
      return { ok: false, reason: 'superhuman-reaction' };
    }
    previousAnsweredAt = event.answeredAt;
  }

  return { ok: true, result: scoreSprint(events) };
}
