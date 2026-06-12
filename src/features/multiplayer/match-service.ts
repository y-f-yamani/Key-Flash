import type { SupabaseClient } from '@supabase/supabase-js';
import { DUEL_RULES, duelOutcome } from '@/core/arena';
import { INITIAL_RATING, tierFor, type Rating } from '@/core/rating';
import type { MatchPlayerView, MatchStatus, MatchView } from './schemas';

/**
 * Server-authoritative match lifecycle (service-role client only — these
 * tables have no client write policies by design). Routes stay thin; all
 * decisions live here; the rating math lives in core and is pure.
 *
 * Submission sentinel: match_players.placement is NULL until a player
 * submits, 0 while waiting for the opponent, and 1/2 once finalized.
 */

const MATCH_DOMAIN = 'win11';
const PENDING_MAX_AGE_MS = 2 * 60_000;
const ABANDON_AFTER_MS = 5 * 60_000;

interface PlayerRow {
  match_id: string;
  user_id: string;
  score: number;
  accuracy: number;
  placement: number | null;
  rating_before: number | null;
  rating_after: number | null;
  profiles: { username: string; display_name: string } | null;
}

interface MatchRow {
  id: string;
  seed: number;
  status: MatchStatus;
  started_at: string | null;
}

export async function joinOrCreateMatch(
  service: SupabaseClient,
  userId: string,
): Promise<{ matchId: string }> {
  // Already queued or playing? Return that match (idempotent join).
  const { data: mine } = await service
    .from('match_players')
    .select('match_id, matches!inner(status)')
    .eq('user_id', userId)
    .in('matches.status', ['pending', 'active'])
    .limit(1);
  if (mine && mine.length > 0) return { matchId: mine[0].match_id as string };

  // Find the oldest fresh pending match from someone else.
  const cutoff = new Date(Date.now() - PENDING_MAX_AGE_MS).toISOString();
  const { data: open } = await service
    .from('matches')
    .select('id, created_at, match_players(user_id)')
    .eq('status', 'pending')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(10);

  const joinable = (open ?? []).find(
    (m) =>
      (m.match_players as { user_id: string }[]).length === 1 &&
      (m.match_players as { user_id: string }[])[0].user_id !== userId,
  );

  if (joinable) {
    // Claim it: flipping pending→active is the lock; if someone else claimed
    // it first, the update matches zero rows and we fall through to create.
    const { data: claimed } = await service
      .from('matches')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', joinable.id)
      .eq('status', 'pending')
      .select('id');
    if (claimed && claimed.length > 0) {
      await service.from('match_players').insert({ match_id: joinable.id, user_id: userId });
      return { matchId: joinable.id };
    }
  }

  const matchId = crypto.randomUUID();
  await service.from('matches').insert({
    id: matchId,
    domain_slug: MATCH_DOMAIN,
    mode: 'duel',
    seed: Math.floor(Math.random() * 2_147_483_647),
    status: 'pending',
  });
  await service.from('match_players').insert({ match_id: matchId, user_id: userId });
  return { matchId };
}

export async function cancelPending(service: SupabaseClient, userId: string): Promise<void> {
  const { data: mine } = await service
    .from('match_players')
    .select('match_id, matches!inner(status)')
    .eq('user_id', userId)
    .eq('matches.status', 'pending');
  for (const row of mine ?? []) {
    await service.from('matches').delete().eq('id', row.match_id).eq('status', 'pending');
  }
}

export async function getMatchView(
  service: SupabaseClient,
  matchId: string,
  userId: string,
): Promise<MatchView | null> {
  const match = await loadMatch(service, matchId);
  if (!match) return null;
  let players = await loadPlayers(service, matchId);
  if (!players.some((p) => p.user_id === userId)) return null;

  // Lifecycle housekeeping happens on read: forfeits and abandonment.
  if (match.status === 'active' && match.started_at) {
    const deadline =
      new Date(match.started_at).getTime() + DUEL_RULES.durationMs + DUEL_RULES.forfeitGraceMs;
    const submitted = players.filter((p) => p.placement !== null).length;
    if (Date.now() > deadline && submitted === 1) {
      await finalizeMatch(service, matchId);
      const reloaded = await loadMatch(service, matchId);
      if (reloaded) {
        match.status = reloaded.status;
        players = await loadPlayers(service, matchId);
      }
    } else if (Date.now() > deadline + ABANDON_AFTER_MS && submitted === 0) {
      await service
        .from('matches')
        .update({ status: 'abandoned' })
        .eq('id', matchId)
        .eq('status', 'active');
      match.status = 'abandoned';
    }
  }

  const view = (p: PlayerRow): MatchPlayerView => ({
    userId: p.user_id,
    username: p.profiles?.username ?? '…',
    displayName: p.profiles?.display_name || (p.profiles?.username ?? '…'),
    submitted: p.placement !== null,
    score: p.score,
    accuracy: p.accuracy,
    placement: p.placement === 0 ? null : p.placement,
    ratingBefore: p.rating_before,
    ratingAfter: p.rating_after,
  });

  return {
    id: match.id,
    seed: Number(match.seed),
    status: match.status,
    startedAt: match.started_at ? new Date(match.started_at).getTime() : null,
    me: players.filter((p) => p.user_id === userId).map(view)[0] ?? null,
    opponent: players.filter((p) => p.user_id !== userId).map(view)[0] ?? null,
  };
}

export async function submitDuelResult(
  service: SupabaseClient,
  matchId: string,
  userId: string,
  validated: { score: number; accuracy: number },
): Promise<{ accepted: boolean; reason?: string }> {
  const match = await loadMatch(service, matchId);
  if (!match || match.status !== 'active') return { accepted: false, reason: 'match-not-active' };

  const players = await loadPlayers(service, matchId);
  const me = players.find((p) => p.user_id === userId);
  if (!me) return { accepted: false, reason: 'not-a-participant' };
  if (me.placement !== null) return { accepted: false, reason: 'already-submitted' };

  await service
    .from('match_players')
    .update({ score: validated.score, accuracy: validated.accuracy, placement: 0 })
    .eq('match_id', matchId)
    .eq('user_id', userId);

  const after = await loadPlayers(service, matchId);
  if (after.every((p) => p.placement !== null) && after.length === 2) {
    await finalizeMatch(service, matchId);
  }
  return { accepted: true };
}

/**
 * Ends the match exactly once (the pending→finished update is the lock),
 * resolves placements + Glicko-2 ratings, awards XP. Unsubmitted players
 * count as score 0 (forfeit).
 */
export async function finalizeMatch(service: SupabaseClient, matchId: string): Promise<void> {
  const { data: locked } = await service
    .from('matches')
    .update({ status: 'finished', finished_at: new Date().toISOString() })
    .eq('id', matchId)
    .eq('status', 'active')
    .select('id');
  if (!locked || locked.length === 0) return; // someone else finalized

  const players = await loadPlayers(service, matchId);
  if (players.length !== 2) return;
  const [pa, pb] = players;

  const [ratingA, ratingB] = await Promise.all([
    loadRating(service, pa.user_id),
    loadRating(service, pb.user_id),
  ]);

  const outcome = duelOutcome(
    { score: pa.score, rating: ratingA },
    { score: pb.score, rating: ratingB },
  );

  await Promise.all([
    persistPlayerOutcome(service, matchId, pa.user_id, outcome.a),
    persistPlayerOutcome(service, matchId, pb.user_id, outcome.b),
    persistRating(service, pa.user_id, outcome.a.ratingAfter),
    persistRating(service, pb.user_id, outcome.b.ratingAfter),
    service.rpc('award_xp', {
      p_user_id: pa.user_id,
      p_amount: outcome.a.xp,
      p_source: 'duel',
      p_source_id: matchId,
    }),
    service.rpc('award_xp', {
      p_user_id: pb.user_id,
      p_amount: outcome.b.xp,
      p_source: 'duel',
      p_source_id: matchId,
    }),
  ]);
}

async function loadMatch(service: SupabaseClient, matchId: string): Promise<MatchRow | null> {
  const { data } = await service
    .from('matches')
    .select('id, seed, status, started_at')
    .eq('id', matchId)
    .maybeSingle();
  return (data as MatchRow | null) ?? null;
}

async function loadPlayers(service: SupabaseClient, matchId: string): Promise<PlayerRow[]> {
  const { data } = await service
    .from('match_players')
    .select('match_id, user_id, score, accuracy, placement, rating_before, rating_after, profiles(username, display_name)')
    .eq('match_id', matchId)
    .order('user_id');
  return (data as unknown as PlayerRow[]) ?? [];
}

async function loadRating(service: SupabaseClient, userId: string): Promise<Rating> {
  const { data } = await service
    .from('ratings')
    .select('rating, rd, volatility')
    .eq('user_id', userId)
    .eq('domain_slug', MATCH_DOMAIN)
    .maybeSingle();
  return data ? { rating: data.rating, rd: data.rd, volatility: data.volatility } : INITIAL_RATING;
}

async function persistRating(
  service: SupabaseClient,
  userId: string,
  rating: Rating,
): Promise<void> {
  await service.from('ratings').upsert({
    user_id: userId,
    domain_slug: MATCH_DOMAIN,
    rating: rating.rating,
    rd: rating.rd,
    volatility: rating.volatility,
    tier: tierFor(rating.rating),
    updated_at: new Date().toISOString(),
  });
}

async function persistPlayerOutcome(
  service: SupabaseClient,
  matchId: string,
  userId: string,
  outcome: { placement: number; ratingBefore: Rating; ratingAfter: Rating },
): Promise<void> {
  await service
    .from('match_players')
    .update({
      placement: outcome.placement,
      rating_before: outcome.ratingBefore.rating,
      rating_after: outcome.ratingAfter.rating,
    })
    .eq('match_id', matchId)
    .eq('user_id', userId);
}
