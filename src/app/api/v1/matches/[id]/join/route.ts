import { NextResponse, type NextRequest } from 'next/server';
import { joinMatchById } from '@/features/multiplayer/match-service';
import { problem } from '@/lib/http';
import { getServerSupabase, getServiceSupabase } from '@/lib/supabase/server';

/** Join a specific private friend room by its match id (shared link). */
export async function POST(
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

  const result = await joinMatchById(service, user.id, id);
  if (!result.ok) return problem(409, 'cannot-join', result.reason ?? 'Cannot join this room.');
  return NextResponse.json({ matchId: id });
}
