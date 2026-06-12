import { NextResponse, type NextRequest } from 'next/server';
import { duelSubmissionSchema } from '@/features/multiplayer/schemas';
import { submitDuelResult } from '@/features/multiplayer/match-service';
import { verifyDuelTimeline } from '@/features/multiplayer/validate-duel';
import { problem } from '@/lib/http';
import { getServerSupabase, getServiceSupabase } from '@/lib/supabase/server';

/**
 * Duel result submission. The server re-scores the timeline AND verifies it
 * answers exactly the seeded prompt sequence — dishonest timelines are
 * rejected, not quarantined (there is no honest way to produce one).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const service = getServiceSupabase();
  if (!supabase || !service) {
    return problem(503, 'cloud-disabled', 'Cloud features are not configured.');
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return problem(401, 'unauthenticated', 'Sign in to duel.');

  const body = await request.json().catch(() => null);
  const parsed = duelSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return problem(400, 'invalid-submission', parsed.error.issues[0]?.message ?? 'Bad payload');
  }

  const { data: match } = await service.from('matches').select('seed').eq('id', id).maybeSingle();
  if (!match) return problem(404, 'match-not-found', 'No such match.');

  const verdict = verifyDuelTimeline(Number(match.seed), parsed.data.durationMs, parsed.data.events);
  if (!verdict.ok) return problem(422, 'invalid-timeline', verdict.reason);

  const outcome = await submitDuelResult(service, id, user.id, {
    score: verdict.result.score,
    accuracy: verdict.result.accuracy,
  });
  if (!outcome.accepted) {
    return problem(409, 'not-accepted', outcome.reason ?? 'Submission rejected.');
  }

  return NextResponse.json({ score: verdict.result.score, accuracy: verdict.result.accuracy });
}
