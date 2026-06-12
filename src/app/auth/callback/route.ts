import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

/**
 * OAuth / magic-link landing: exchanges the auth code for a session cookie,
 * then redirects into the app. Failures are NEVER swallowed — they redirect
 * to the sign-in page with the reason, so misconfiguration diagnoses itself.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/en';
  const locale = next.startsWith('/ar') ? 'ar' : 'en';
  const providerError = url.searchParams.get('error_description') ?? url.searchParams.get('error');

  if (providerError) {
    return redirectWithError(url.origin, locale, providerError);
  }
  if (!code) {
    return redirectWithError(url.origin, locale, 'Missing auth code in callback URL.');
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return redirectWithError(url.origin, locale, 'Cloud is not configured on this server.');
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectWithError(url.origin, locale, error.message);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

function redirectWithError(origin: string, locale: string, message: string) {
  const target = new URL(`/${locale}/sign-in`, origin);
  target.searchParams.set('error', message.slice(0, 200));
  return NextResponse.redirect(target);
}
