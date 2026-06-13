import { notFound } from 'next/navigation';
import { registry } from '@/content';
import { CategoryChallenge } from '@/features/learn/category-challenge';
import { getDictionary, isLocale } from '@/lib/i18n';

export default async function CategoryChallengePage({
  params,
}: {
  params: Promise<{ locale: string; categoryId: string }>;
}) {
  const { locale, categoryId } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const category = registry.getDomain('win11')?.categories.find((c) => c.id === categoryId);
  if (!category) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">{category.name[locale]}</h1>
        <p className="text-muted-foreground">{dict.path.drillCapstone}</p>
      </header>
      <CategoryChallenge categoryId={categoryId} />
    </div>
  );
}
