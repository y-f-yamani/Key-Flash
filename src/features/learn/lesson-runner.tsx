'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { registry } from '@/content';
import { DrillSession } from '@/features/practice/drill-session';
import { useProgress } from '@/features/progress';
import { useI18n } from '@/lib/i18n/provider';
import type { Lesson } from '@/core/content';
import { LessonTeach } from './lesson-teach';

/**
 * A lesson runs in two halves: first LEARN (teach each shortcut with the
 * highlighted keyboard + simulator preview), then PRACTICE (the drill that
 * tests recall). Completion XP is awarded once, after practice.
 */
export function LessonRunner({ lesson }: { lesson: Lesson }) {
  const { locale, dict } = useI18n();
  const { completeLesson } = useProgress();
  const router = useRouter();
  const awarded = useRef(false);
  const [phase, setPhase] = useState<'learn' | 'practice'>('learn');

  const shortcuts = lesson.shortcutIds
    .map((id) => registry.getShortcut(id))
    .filter((s) => s !== undefined);

  if (phase === 'learn') {
    return <LessonTeach shortcuts={shortcuts} onDone={() => setPhase('practice')} />;
  }

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
        onClick: () => router.push(`/${locale}/learn`),
      }}
    />
  );
}
