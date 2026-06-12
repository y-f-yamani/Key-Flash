import { NextResponse, type NextRequest } from 'next/server';
import { validateRun, runSubmissionSchema } from '@/features/arena/run-validation';
import { getServerSupabase, getServiceSupabase } from '@/lib/supabase/server';

/**
 * Scored-run submission. Client measures, server judges (docs/06):
 * the timeline is re-scored here and the server's numbers are stored.
 * Inserts use the service role because arena_runs intentionally has no
 * client INSERT policy; idempotent via the client-generated run id.
 */
export async function POST(request: NextRequest) {
  const supabase = await getServerSupabase();
  const service = getServiceSupabase();
  if (!supabase || !service) {
    return problem(503, 'cloud-disabled', 'Cloud features are not configured.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return problem(401, 'unauthenticated', 'Sign in to submit runs.');
  }

  const body = await request.json().catch(() => null);
  const parsed = runSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return problem(400, 'invalid-submission', parsed.error.issues[0]?.message ?? 'Bad payload');
  }

  const submission = parsed.data;
  const { result, quarantined, reasons } = validateRun(submission);

  const { error: insertError } = await service.from('arena_runs').upsert(
    {
      id: submission.id,
      user_id: user.id,
      domain_slug: submission.domain,
      mode: submission.mode,
      score: result.score,
      accuracy: result.accuracy,
      avg_reaction_ms: result.avgReactionMs,
      consistency: result.consistency,
      max_combo: result.maxCombo,
      duration_ms: submission.durationMs,
      timeline: submission.events,
      client_version: submission.clientVersion,
      quarantined,
    },
    { onConflict: 'id', ignoreDuplicates: true }, // retries no-op
  );
  if (insertError) {
    return problem(500, 'storage-error', insertError.message);
  }

  if (!quarantined) {
    const xp = 20 + Math.round(result.score / 100);
    await service.rpc('award_xp', {
      p_user_id: user.id,
      p_amount: xp,
      p_source: 'arena-run',
      p_source_id: submission.id,
    });
  }

  return NextResponse.json(
    {
      runId: submission.id,
      score: result.score,
      accuracy: result.accuracy,
      avgReactionMs: result.avgReactionMs,
      consistency: result.consistency,
      quarantined,
      reasons,
    },
    { status: 201 },
  );
}

/** RFC 7807 problem responses (docs/06 convention). */
function problem(status: number, type: string, detail: string) {
  return NextResponse.json(
    { type: `https://keymaster.app/problems/${type}`, title: type, status, detail },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );
}
