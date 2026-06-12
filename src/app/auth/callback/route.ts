import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

/**
 * OAuth / magic-link landing: exchanges the auth code for a session cookie,
 * then redirects into the app. Locale-agnostic by design (`next` carries it).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/en';

  if (code) {
    const supabase = await getServerSupabase();
    if (supabase) await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
