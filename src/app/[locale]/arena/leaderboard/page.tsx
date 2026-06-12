import { notFound } from 'next/navigation';
import { Leaderboard } from '@/features/arena/leaderboard';
import { getDictionary, isLocale } from '@/lib/i18n';

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">{dict.leaderboard.title}</h1>
        <p className="text-muted-foreground">{dict.leaderboard.subtitle}</p>
      </header>
      <Leaderboard domainSlug="win11" mode="sprint" />
    </div>
  );
}
