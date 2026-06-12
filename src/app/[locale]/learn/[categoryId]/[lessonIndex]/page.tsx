import { notFound } from 'next/navigation';
import { lessonsFor } from '@/content';
import { LessonRunner } from '@/features/learn/lesson-runner';
import { isLocale } from '@/lib/i18n';

// Lessons derive deterministically from the catalog — prerender all of them.
export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { categoryId: string } }) {
  return lessonsFor('win11')
    .filter((lesson) => lesson.categoryId === params.categoryId)
    .map((lesson) => ({ lessonIndex: String(lesson.index) }));
}

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
