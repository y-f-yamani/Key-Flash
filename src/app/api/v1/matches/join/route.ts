import { NextResponse, type NextRequest } from 'next/server';
import { cancelPending, joinOrCreateMatch } from '@/features/multiplayer/match-service';
import { problem } from '@/lib/http';
import { getServerSupabase, getServiceSupabase } from '@/lib/supabase/server';

/** POST = enter a duel queue (idempotent). DELETE = leave all queues. */
export async function POST(request: NextRequest) {
  const ctx = await requireUser();
  if ('response' in ctx) return ctx.response;
  const body = await request.json().catch(() => ({}));
  const kind = body?.kind === 'typing' ? 'typing' : 'shortcut';
  const { matchId } = await joinOrCreateMatch(ctx.service, ctx.userId, kind);
  return NextResponse.json({ matchId }, { status: 201 });
}

export async function DELETE() {
  const ctx = await requireUser();
  if ('response' in ctx) return ctx.response;
  await cancelPending(ctx.service, ctx.userId);
  return NextResponse.json({ ok: true });
}

async function requireUser() {
  const supabase = await getServerSupabase();
  const service = getServiceSupabase();
  if (!supabase || !service) {
    return { response: problem(503, 'cloud-disabled', 'Cloud features are not configured.') };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { response: problem(401, 'unauthenticated', 'Sign in to duel.') };
  return { service, userId: user.id };
}
