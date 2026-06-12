import { notFound } from 'next/navigation';
import { MODES, getMode } from '@/core/arena';
import { ArenaGame } from '@/features/arena/arena-game';
import { isLocale } from '@/lib/i18n';

// Modes are a fixed set defined in code — prerender every one.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(MODES).map((mode) => ({ mode }));
}

export default async function ArenaModePage({
  params,
}: {
  params: Promise<{ locale: string; mode: string }>;
}) {
  const { locale, mode } = await params;
  if (!isLocale(locale)) notFound();
  if (!getMode(mode)) notFound(); // includes 'reaction' until implemented

  // Mode rules contain functions, so only the slug crosses the RSC boundary;
  // the client component resolves the rules itself.
  return (
    <div className="mx-auto w-full max-w-3xl">
      <ArenaGame mode={mode} domainSlug="win11" />
    </div>
  );
}
