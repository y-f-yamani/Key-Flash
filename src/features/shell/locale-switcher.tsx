'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

/** Swaps the locale segment of the current path: /en/learn ↔ /ar/learn. */
export function LocaleSwitcher() {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const other = locale === 'en' ? 'ar' : 'en';
  const target = pathname.replace(`/${locale}`, `/${other}`) || `/${other}`;

  return (
    <Link
      href={target}
      aria-label={dict.a11y.switchLanguage}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold hover:bg-muted"
    >
      <Languages className="size-4" />
      {other === 'ar' ? 'العربية' : 'English'}
    </Link>
  );
}
