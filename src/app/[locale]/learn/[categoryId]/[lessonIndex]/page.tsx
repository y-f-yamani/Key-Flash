import { notFound } from 'next/navigation';
import { lessonsFor } from '@/content';
import { LessonRunner } from '@/features/learn/lesson-runner';
import { isLocale } from '@/lib/i18n';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ locale: string; categoryId: string; lessonIndex: string }>;
}) {
  const { locale, categoryId, lessonIndex } = await params;
  if (!isLocale(locale)) notFound();

  const index = Number(lessonIndex);
  const lesson = lessonsFor('win11').find(
    (l) => l.categoryId === categoryId && l.index === index,
  );
  if (!lesson) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <LessonRunner lesson={lesson} />
    </div>
  );
}
