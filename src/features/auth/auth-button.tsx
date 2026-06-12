'use client';

/* eslint-disable @next/next/no-img-element -- avatar URLs come from GitHub's
   CDN; next/image would require remotePatterns config for marginal gain. */

import Link from 'next/link';
import { LogIn, LogOut, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from './provider';

/**
 * Header auth control: hidden in local-first mode; "Sign in" when signed
 * out; avatar + username + sign-out when signed in, so the signed-in state
 * is unmistakable.
 */
export function AuthButton() {
  const { locale, dict } = useI18n();
  const { session, ready, cloudEnabled, signOut } = useAuth();

  if (!cloudEnabled || !ready) return null;

  if (!session) {
    return (
      <Link href={`/${locale}/sign-in`}>
        <Button variant="outline" size="sm">
          <LogIn className="size-4" />
          {dict.auth.signIn}
        </Button>
      </Link>
    );
  }

  const meta = session.user.user_metadata as Record<string, unknown>;
  const name =
    (meta.user_name as string) ??
    (meta.preferred_username as string) ??
    (meta.full_name as string) ??
    session.user.email?.split('@')[0] ??
    '…';
  const avatarUrl = meta.avatar_url as string | undefined;

  return (
    <span className="flex items-center gap-1.5" data-testid="signed-in-chip">
      <span
        className="flex items-center gap-2 rounded-full border border-border bg-muted py-1 pe-3 ps-1 text-sm font-semibold"
        title={session.user.email}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-6 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <UserRound className="size-5 rounded-full bg-border p-0.5" aria-hidden />
        )}
        {name}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void signOut()}
        aria-label={dict.auth.signOut}
        title={dict.auth.signOut}
      >
        <LogOut className="size-4" />
      </Button>
    </span>
  );
}
