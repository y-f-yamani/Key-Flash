import { NextResponse, type NextRequest } from 'next/server';
import { getMatchView } from '@/features/multiplayer/match-service';
import { problem } from '@/lib/http';
import { getServerSupabase, getServiceSupabase } from '@/lib/supabase/server';

/** Match state for a participant; also applies forfeit/abandon timeouts. */
export async function GET(
  _request: NextRequest,
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

  const view = await getMatchView(service, id, user.id);
  if (!view) return problem(404, 'match-not-found', 'No such match for this player.');
  return NextResponse.json(view);
}
