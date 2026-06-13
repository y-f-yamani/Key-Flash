'use client';

import { useRouter } from 'next/navigation';
import { registry } from '@/content';
import { DrillSession } from '@/features/practice/drill-session';
import { useI18n } from '@/lib/i18n/provider';

/** A category's mastery-challenge capstone: drill every shortcut, then return. */
export function CategoryChallenge({ categoryId }: { categoryId: string }) {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const shortcuts = registry.shortcutsInCategory('win11', categoryId);

  return (
    <DrillSession
      shortcuts={shortcuts}
      completeAction={{
        label: dict.path.backToPath,
        onClick: () => router.push(`/${locale}/learn`),
      }}
    />
  );
}
