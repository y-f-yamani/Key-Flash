import type { DuelSubmission, MatchView } from './schemas';
import type { TypingDuelSubmission } from './validate-typing';

/** Thin typed fetch layer over the match API — UI components stay clean. */

export async function joinQueue(
  kind: 'shortcut' | 'typing' = 'shortcut',
): Promise<{ matchId: string } | null> {
  const response = await fetch('/api/v1/matches/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind }),
  });
  return response.ok ? response.json() : null;
}

/** Opens a private friend room; returns the match id to share via link. */
export async function createRoom(
  kind: 'shortcut' | 'typing' = 'shortcut',
): Promise<{ matchId: string } | null> {
  const response = await fetch('/api/v1/matches/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, private: true }),
  });
  return response.ok ? response.json() : null;
}

/** Joins a shared friend room by id. Returns false if the room can't be joined. */
export async function joinRoom(matchId: string): Promise<boolean> {
  const response = await fetch(`/api/v1/matches/${matchId}/join`, { method: 'POST' });
  return response.ok;
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
  submission: DuelSubmission | TypingDuelSubmission,
): Promise<boolean> {
  const response = await fetch(`/api/v1/matches/${matchId}/result`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(submission),
  });
  return response.ok;
}
