import { notFound } from 'next/navigation';
import { ReviewQueue } from '@/features/practice/review-queue';
import { getDictionary, isLocale } from '@/lib/i18n';

export default async function PracticePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">{dict.practice.title}</h1>
        <p className="text-muted-foreground">{dict.practice.subtitle}</p>
      </header>
      <ReviewQueue />
    </div>
  );
}
