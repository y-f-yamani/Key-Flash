'use client';

import Link from 'next/link';
import { LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from './provider';

/** Header control: hidden in local-first mode, sign-in link, or sign-out. */
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

  return (
    <Button variant="ghost" size="sm" onClick={() => void signOut()} title={session.user.email}>
      <LogOut className="size-4" />
      {dict.auth.signOut}
    </Button>
  );
}
