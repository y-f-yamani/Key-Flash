import { notFound } from 'next/navigation';
import { StatsDashboard } from '@/features/stats/stats-dashboard';
import { getDictionary, isLocale } from '@/lib/i18n';

export default async function StatsPage({
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
        <h1 className="text-3xl font-extrabold">{dict.stats.title}</h1>
        <p className="text-muted-foreground">{dict.stats.subtitle}</p>
      </header>
      <StatsDashboard domainSlug="win11" />
    </div>
  );
}
