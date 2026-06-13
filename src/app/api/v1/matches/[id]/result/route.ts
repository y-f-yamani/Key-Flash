import { NextResponse, type NextRequest } from 'next/server';
import { duelSubmissionSchema } from '@/features/multiplayer/schemas';
import { submitDuelResult } from '@/features/multiplayer/match-service';
import { verifyDuelTimeline } from '@/features/multiplayer/validate-duel';
import {
  typingDuelSubmissionSchema,
  verifyTypingTimeline,
} from '@/features/multiplayer/validate-typing';
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

  const { data: match } = await service
    .from('matches')
    .select('seed, mode')
    .eq('id', id)
    .maybeSingle();
  if (!match) return problem(404, 'match-not-found', 'No such match.');

  // The match mode decides which judge runs; both re-compute the score
  // server-side from raw input logs. Private rooms share the same judges
  // (mode 'typing' or 'typing-private').
  let validated: { score: number; accuracy: number };
  if (match.mode.startsWith('typing')) {
    const parsed = typingDuelSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return problem(400, 'invalid-submission', parsed.error.issues[0]?.message ?? 'Bad payload');
    }
    const verdict = verifyTypingTimeline(
      Number(match.seed),
      parsed.data.durationMs,
      parsed.data.keystrokes,
    );
    if (!verdict.ok) return problem(422, 'invalid-timeline', verdict.reason);
    validated = { score: verdict.score, accuracy: verdict.accuracy };
  } else {
    const parsed = duelSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return problem(400, 'invalid-submission', parsed.error.issues[0]?.message ?? 'Bad payload');
    }
    const verdict = verifyDuelTimeline(
      Number(match.seed),
      parsed.data.durationMs,
      parsed.data.events,
    );
    if (!verdict.ok) return problem(422, 'invalid-timeline', verdict.reason);
    validated = { score: verdict.result.score, accuracy: verdict.result.accuracy };
  }

  const outcome = await submitDuelResult(service, id, user.id, validated);
  if (!outcome.accepted) {
    return problem(409, 'not-accepted', outcome.reason ?? 'Submission rejected.');
  }

  return NextResponse.json(validated);
}
