import type { DrillEvent } from '@/core/scoring';
import type { RunSubmission } from './run-validation';

/**
 * Fire-and-forget leaderboard submission. Failures are silent by design:
 * the local result is already shown; the leaderboard is eventually
 * consistent and a lost run is not worth interrupting the player.
 */
export async function submitSprintRun(args: {
  domain: string;
  mode: RunSubmission['mode'];
  durationMs: number;
  events: readonly DrillEvent[];
}): Promise<void> {
  const submission: RunSubmission = {
    id: crypto.randomUUID(),
    domain: args.domain,
    mode: args.mode,
    startedAt: Date.now() - args.durationMs,
    durationMs: args.durationMs,
    clientVersion: 'web-0.3',
    events: [...args.events],
  };
  try {
    await fetch('/api/v1/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(submission),
    });
  } catch {
    // Offline or server down — intentionally ignored.
  }
}
