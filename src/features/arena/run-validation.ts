import { z } from 'zod';
import { SPRINT_RULES, scoreSprint, type SprintResult } from '@/core/scoring';

/**
 * Run submission contract + server-side validation. Shared by the client
 * (request building) and the route handler (the judge). Pure — fully
 * unit-tested without HTTP or Supabase.
 *
 * Anti-cheat model (docs/06): the client reports a timeline, the server
 * recomputes the score from it and uses its own number; physically
 * implausible timelines are quarantined, not rejected (no oracle for cheats).
 */

export const runSubmissionSchema = z.object({
  id: z.uuid(),
  domain: z.string().min(1).max(32),
  mode: z.literal('sprint'),
  startedAt: z.number().int().nonnegative(),
  durationMs: z.number().int().positive().max(10 * 60_000),
  clientVersion: z.string().max(32).default(''),
  events: z
    .array(
      z.object({
        shortcutId: z.string().min(1).max(64),
        promptAt: z.number().nonnegative(),
        answeredAt: z.number().nonnegative(),
        correct: z.boolean(),
      }),
    )
    .min(1)
    .max(300),
});

export type RunSubmission = z.infer<typeof runSubmissionSchema>;

/** Floor below which a human cannot react to an unseen prompt. */
export const REACTION_FLOOR_MS = 80;

export interface ValidatedRun {
  result: SprintResult;
  quarantined: boolean;
  reasons: string[];
}

export function validateRun(submission: RunSubmission): ValidatedRun {
  const reasons: string[] = [];
  const { events, durationMs } = submission;

  if (submission.mode === 'sprint' && durationMs !== SPRINT_RULES.durationMs) {
    reasons.push('duration-mismatch');
  }

  let previousAnsweredAt = -1;
  for (const event of events) {
    if (event.answeredAt <= event.promptAt) {
      reasons.push('non-positive-reaction');
      break;
    }
    if (event.promptAt < previousAnsweredAt) {
      reasons.push('overlapping-events');
      break;
    }
    if (event.answeredAt > durationMs + 2_000) {
      reasons.push('event-after-run-end');
      break;
    }
    if (event.correct && event.answeredAt - event.promptAt < REACTION_FLOOR_MS) {
      reasons.push('superhuman-reaction');
      break;
    }
    previousAnsweredAt = event.answeredAt;
  }

  return {
    result: scoreSprint(events),
    quarantined: reasons.length > 0,
    reasons,
  };
}
