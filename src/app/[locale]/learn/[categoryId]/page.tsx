import { notFound } from 'next/navigation';
import { registry } from '@/content';
import { LessonList } from '@/features/learn/lesson-list';
import { getDictionary, isLocale } from '@/lib/i18n';

// Rendered on demand for symmetry with the nested lesson route; the page
// calls notFound() for unknown categories.

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; categoryId: string }>;
}) {
  const { locale, categoryId } = await params;
  if (!isLocale(locale)) notFound();
  getDictionary(locale);

  const domain = registry.getDomain('win11');
  const category = domain?.categories.find((c) => c.id === categoryId);
  if (!category) notFound();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">{category.name[locale]}</h1>
        <p className="text-muted-foreground">{category.description[locale]}</p>
      </header>
      <LessonList domainSlug="win11" categoryId={categoryId} />
    </div>
  );
}
