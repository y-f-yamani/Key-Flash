'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Keyboard } from 'lucide-react';
import { AuthButton } from '@/features/auth/auth-button';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { LocaleSwitcher } from './locale-switcher';
import { PlayerChip } from './player-chip';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  const { locale, dict } = useI18n();
  const pathname = usePathname();

  const links = [
    { href: `/${locale}/learn`, label: dict.nav.learn },
    { href: `/${locale}/practice`, label: dict.nav.practice },
    { href: `/${locale}/typing`, label: dict.nav.typing },
    { href: `/${locale}/simulator`, label: dict.nav.simulator },
    { href: `/${locale}/arena`, label: dict.nav.arena },
    { href: `/${locale}/stats`, label: dict.nav.stats },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={`/${locale}`} className="flex items-center gap-2 font-extrabold">
          <Keyboard className="size-5 text-primary" aria-hidden />
          {dict.appName}
        </Link>

        <nav className="flex items-center gap-1 text-sm font-semibold">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-lg px-3 py-1.5 transition-colors hover:bg-muted',
                pathname.startsWith(link.href) && 'bg-muted text-primary',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <PlayerChip />
          <AuthButton />
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
