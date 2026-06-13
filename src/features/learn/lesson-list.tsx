'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeyCombo } from '@/components/shared/key-combo';
import { lessonsFor, registry } from '@/content';
import { mastery, useProgress } from '@/features/progress';
import { useI18n } from '@/lib/i18n/provider';

/** Lessons of one category, with the shortcuts each lesson teaches. */
export function LessonList({ domainSlug, categoryId }: { domainSlug: string; categoryId: string }) {
  const { locale, dict } = useI18n();
  const { state } = useProgress();

  const lessons = lessonsFor(domainSlug).filter((l) => l.categoryId === categoryId);

  return (
    <div className="flex flex-col gap-4">
      {lessons.map((lesson) => {
        const progress = mastery(state, lesson.shortcutIds);
        return (
          <Card key={lesson.id}>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <span className="font-bold">
                  {dict.learn.lesson} {lesson.index + 1}
                </span>
                <Badge variant={progress >= 0.999 ? 'success' : 'muted'}>
                  {Math.round(progress * 100)}% {dict.learn.masteredLabel}
                </Badge>
              </div>
              <ul className="flex flex-col gap-2">
                {lesson.shortcutIds.map((id) => {
                  const shortcut = registry.getShortcut(id);
                  if (!shortcut) return null;
                  return (
                    <li key={id} className="flex items-center justify-between gap-4 text-sm">
                      <span>{shortcut.name[locale]}</span>
                      <KeyCombo keys={shortcut.keys} />
                    </li>
                  );
                })}
              </ul>
              <Link href={`/${locale}/learn/${categoryId}/${lesson.index}`} className="w-fit">
                <Button size="sm">{dict.learn.startLesson}</Button>
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
