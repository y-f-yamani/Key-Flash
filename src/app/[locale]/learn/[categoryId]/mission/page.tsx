import { notFound } from 'next/navigation';
import { registry } from '@/content';
import { buildLearningPath } from '@/features/learn/path';
import { CategoryMission } from '@/features/learn/category-mission';
import { getDictionary, isLocale } from '@/lib/i18n';

export default async function CategoryMissionPage({
  params,
}: {
  params: Promise<{ locale: string; categoryId: string }>;
}) {
  const { locale, categoryId } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const category = registry.getDomain('win11')?.categories.find((c) => c.id === categoryId);
  const capstone = buildLearningPath('win11')
    .find((c) => c.categoryId === categoryId)
    ?.nodes.at(-1);
  if (!category || capstone?.kind !== 'capstone-sim') notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">{category.name[locale]}</h1>
        <p className="text-muted-foreground">{dict.path.simCapstone}</p>
      </header>
      <CategoryMission shortcutIds={[...capstone.shortcutIds]} />
    </div>
  );
}
