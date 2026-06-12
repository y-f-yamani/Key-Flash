import { describe, expect, it } from 'vitest';
import { scoreSprint } from '@/core/scoring';
import { runSubmissionSchema, validateRun, type RunSubmission } from './run-validation';

function submission(overrides: Partial<RunSubmission> = {}): RunSubmission {
  return {
    id: 'f8b7c364-3f1f-4a47-9c30-1c2c1c2c1c2c',
    domain: 'win11',
    mode: 'sprint',
    startedAt: 1_760_000_000_000,
    durationMs: 60_000,
    clientVersion: 'test',
    events: [
      { shortcutId: 'win11.win-e', promptAt: 0, answeredAt: 450, correct: true },
      { shortcutId: 'win11.win-i', promptAt: 500, answeredAt: 1_200, correct: true },
      { shortcutId: 'win11.win-s', promptAt: 1_300, answeredAt: 2_000, correct: false },
    ],
    ...overrides,
  };
}

describe('runSubmissionSchema', () => {
  it('accepts a well-formed submission', () => {
    expect(runSubmissionSchema.safeParse(submission()).success).toBe(true);
  });

  it('rejects bad ids, unknown modes and empty timelines', () => {
    expect(runSubmissionSchema.safeParse(submission({ id: 'nope' })).success).toBe(false);
    expect(
      runSubmissionSchema.safeParse({ ...submission(), mode: 'cheat' }).success,
    ).toBe(false);
    expect(runSubmissionSchema.safeParse(submission({ events: [] })).success).toBe(false);
  });
});

describe('validateRun', () => {
  it('clean run: server score equals deterministic re-score, no quarantine', () => {
    const sub = submission();
    const { result, quarantined, reasons } = validateRun(sub);
    expect(quarantined).toBe(false);
    expect(reasons).toEqual([]);
    expect(result).toEqual(scoreSprint(sub.events));
  });

  it('quarantines superhuman reactions', () => {
    const sub = submission({
      events: [{ shortcutId: 'x', promptAt: 0, answeredAt: 30, correct: true }],
    });
    const { quarantined, reasons } = validateRun(sub);
    expect(quarantined).toBe(true);
    expect(reasons).toContain('superhuman-reaction');
  });

  it('quarantines overlapping / non-monotonic timelines', () => {
    const sub = submission({
      events: [
        { shortcutId: 'a', promptAt: 1_000, answeredAt: 2_000, correct: true },
        { shortcutId: 'b', promptAt: 500, answeredAt: 2_500, correct: true }, // prompt before previous answer
      ],
    });
    expect(validateRun(sub).reasons).toContain('overlapping-events');
  });

  it('quarantines events after the run ended and zero-length reactions', () => {
    expect(
      validateRun(
        submission({
          events: [{ shortcutId: 'a', promptAt: 70_000, answeredAt: 70_500, correct: true }],
        }),
      ).reasons,
    ).toContain('event-after-run-end');

    expect(
      validateRun(
        submission({
          events: [{ shortcutId: 'a', promptAt: 100, answeredAt: 100, correct: false }],
        }),
      ).reasons,
    ).toContain('non-positive-reaction');
  });

  it('quarantines sprint runs with a tampered duration', () => {
    expect(validateRun(submission({ durationMs: 120_000 })).reasons).toContain(
      'duration-mismatch',
    );
  });
});
