'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { registry } from '@/content';
import { DrillSession } from '@/features/practice/drill-session';
import { useProgress } from '@/features/progress';
import { useI18n } from '@/lib/i18n/provider';
import type { Lesson } from '@/core/content';

/** Runs one lesson as a drill session and awards completion XP exactly once. */
export function LessonRunner({ lesson }: { lesson: Lesson }) {
  const { locale, dict } = useI18n();
  const { completeLesson } = useProgress();
  const router = useRouter();
  const awarded = useRef(false);

  const shortcuts = lesson.shortcutIds
    .map((id) => registry.getShortcut(id))
    .filter((s) => s !== undefined);

  return (
    <DrillSession
      shortcuts={shortcuts}
      onComplete={() => {
        if (awarded.current) return;
        awarded.current = true;
        completeLesson();
      }}
      completeAction={{
        label: dict.learn.backToPath,
        onClick: () => router.push(`/${locale}/learn/${lesson.categoryId}`),
      }}
    />
  );
}
