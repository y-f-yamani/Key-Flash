import { z } from 'zod';
import { generateWords } from '@/content/typing/words';
import { createRng } from '@/core/arena';
import { applyKey, createSession, sessionStats } from '@/core/typing';

/**
 * Typing-duel judgement. The client submits its RAW KEYSTROKE LOG; the
 * server replays it through the same pure typing engine against the seeded
 * target text and computes the stats itself. Nothing the client claims about
 * its own speed is trusted.
 */

export const TYPING_DUEL_RULES = {
  durationMs: 45_000,
  /** Words generated from the seed — comfortably more than anyone types in 45s. */
  targetWords: 150,
  /** Sustained median inter-key gap below this is not human typing. */
  minMedianGapMs: 25,
} as const;

export const typingDuelSubmissionSchema = z.object({
  durationMs: z.number().int().positive().max(10 * 60_000),
  keystrokes: z
    .array(
      z.object({
        /** Single printable character or 'Backspace'. */
        key: z.string().min(1).max(9),
        /** ms offset from play start. */
        at: z.number().nonnegative(),
      }),
    )
    .max(1_500),
});

export type TypingDuelSubmission = z.infer<typeof typingDuelSubmissionSchema>;

/**
 * Both clients and the server derive the SAME text from the match seed.
 * English corpus regardless of UI locale — both players must get identical
 * content for the duel to be fair.
 */
export function duelTypingTarget(seed: number): string {
  return generateWords(createRng(seed), 'en', TYPING_DUEL_RULES.targetWords);
}

export function verifyTypingTimeline(
  seed: number,
  durationMs: number,
  keystrokes: TypingDuelSubmission['keystrokes'],
):
  | { ok: true; score: number; accuracy: number; netWpm: number }
  | { ok: false; reason: string } {
  if (durationMs !== TYPING_DUEL_RULES.durationMs) {
    return { ok: false, reason: 'duration-mismatch' };
  }

  let previousAt = -1;
  const gaps: number[] = [];
  for (const stroke of keystrokes) {
    if (stroke.key !== 'Backspace' && stroke.key.length !== 1) {
      return { ok: false, reason: 'invalid-key' };
    }
    if (stroke.at < previousAt) return { ok: false, reason: 'non-monotonic' };
    if (stroke.at > durationMs + 2_000) return { ok: false, reason: 'event-after-run-end' };
    if (previousAt >= 0) gaps.push(stroke.at - previousAt);
    previousAt = stroke.at;
  }

  if (gaps.length >= 20) {
    const median = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
    if (median < TYPING_DUEL_RULES.minMedianGapMs) {
      return { ok: false, reason: 'superhuman-typing' };
    }
  }

  // Replay through the same engine the client used.
  let session = createSession(duelTypingTarget(seed));
  for (const stroke of keystrokes) {
    session = applyKey(session, stroke.key, stroke.at);
  }
  const stats = sessionStats(session, durationMs);

  return {
    ok: true,
    // Centi-WPM as the integer match score — enough precision for ranking.
    score: Math.round(stats.netWpm * 100),
    accuracy: stats.accuracy,
    netWpm: stats.netWpm,
  };
}
