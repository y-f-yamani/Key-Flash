'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { createRoom, joinRoom } from './match-client';

const noopSubscribe = () => () => {};

/**
 * Private friend-room plumbing shared by both duel games: hosting a room
 * (returns a shareable link), and reading the `?join=<id>` param a friend's
 * link carries so the duel can auto-join.
 */
export function useFriendRoom(kind: 'shortcut' | 'typing') {
  const [roomLink, setRoomLink] = useState<string | null>(null);

  // SSR-safe read of the join param from the current URL.
  const pendingJoinId = useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).get('join'),
    () => null,
  );

  const host = useCallback(async (): Promise<string | null> => {
    const room = await createRoom(kind);
    if (!room) return null;
    setRoomLink(`${window.location.origin}${window.location.pathname}?join=${room.matchId}`);
    return room.matchId;
  }, [kind]);

  const acceptJoin = useCallback((matchId: string) => joinRoom(matchId), []);
  const clearLink = useCallback(() => setRoomLink(null), []);

  return { roomLink, pendingJoinId, host, acceptJoin, clearLink };
}
