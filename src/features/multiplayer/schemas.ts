import { z } from 'zod';

/** Wire contracts shared by the duel client and the match API routes. */

export const duelSubmissionSchema = z.object({
  durationMs: z.number().int().positive().max(10 * 60_000),
  events: z
    .array(
      z.object({
        shortcutId: z.string().min(1).max(64),
        promptAt: z.number().nonnegative(),
        answeredAt: z.number().nonnegative(),
        correct: z.boolean(),
      }),
    )
    .max(300),
});

export type DuelSubmission = z.infer<typeof duelSubmissionSchema>;

export type MatchStatus = 'pending' | 'active' | 'finished' | 'abandoned';

export interface MatchPlayerView {
  userId: string;
  username: string;
  displayName: string;
  submitted: boolean;
  score: number;
  accuracy: number;
  placement: number | null;
  ratingBefore: number | null;
  ratingAfter: number | null;
}

export interface MatchView {
  id: string;
  seed: number;
  status: MatchStatus;
  /** Epoch ms; play begins at startedAt + countdown. */
  startedAt: number | null;
  me: MatchPlayerView | null;
  opponent: MatchPlayerView | null;
}
