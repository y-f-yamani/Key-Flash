import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALES } from '@/lib/i18n/config';

/**
 * Locale routing: requests without a locale segment are redirected to the
 * default locale ("/learn" → "/en/learn"). Locale detection from the
 * Accept-Language header can be layered in here later without touching pages.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip static assets, API routes and files with extensions.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
