import { notFound } from 'next/navigation';
import { SprintGame } from '@/features/arena/sprint-game';
import { isLocale } from '@/lib/i18n';

export default async function SprintPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <SprintGame domainSlug="win11" />
    </div>
  );
}
