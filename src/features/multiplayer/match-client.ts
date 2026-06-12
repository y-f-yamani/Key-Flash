import type { DuelSubmission, MatchView } from './schemas';

/** Thin typed fetch layer over the match API — UI components stay clean. */

export async function joinQueue(): Promise<{ matchId: string } | null> {
  const response = await fetch('/api/v1/matches/join', { method: 'POST' });
  return response.ok ? response.json() : null;
}

export async function leaveQueue(): Promise<void> {
  await fetch('/api/v1/matches/join', { method: 'DELETE' }).catch(() => {});
}

export async function fetchMatch(matchId: string): Promise<MatchView | null> {
  const response = await fetch(`/api/v1/matches/${matchId}`);
  return response.ok ? response.json() : null;
}

export async function submitDuel(
  matchId: string,
  submission: DuelSubmission,
): Promise<boolean> {
  const response = await fetch(`/api/v1/matches/${matchId}/result`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(submission),
  });
  return response.ok;
}
