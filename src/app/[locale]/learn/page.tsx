import { notFound } from 'next/navigation';
import { CategoryGrid } from '@/features/learn/category-grid';
import { getDictionary, isLocale } from '@/lib/i18n';

export default async function LearnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">{dict.learn.title}</h1>
        <p className="text-muted-foreground">{dict.learn.subtitle}</p>
      </header>
      <CategoryGrid domainSlug="win11" />
    </div>
  );
}
