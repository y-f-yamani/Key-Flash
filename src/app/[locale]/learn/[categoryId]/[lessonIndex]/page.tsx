import { notFound } from 'next/navigation';
import { lessonsFor } from '@/content';
import { LessonRunner } from '@/features/learn/lesson-runner';
import { isLocale } from '@/lib/i18n';

// Rendered on demand: a nested generateStaticParams here would depend on the
// parent categoryId, which this Next version does not inject into the child,
// causing valid lessons to 404 in production. The page calls notFound() for
// anything invalid, so on-demand rendering is both correct and simpler.

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
    <div className="mx-auto w-full max-w-5xl">
      <LessonRunner lesson={lesson} />
    </div>
  );
}
