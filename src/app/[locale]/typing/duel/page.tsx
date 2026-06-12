import { notFound } from 'next/navigation';
import { TypingDuelGame } from '@/features/multiplayer/typing-duel-game';
import { getDictionary, isLocale } from '@/lib/i18n';

export default async function TypingDuelPage({
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
        <h1 className="text-3xl font-extrabold">{dict.typingDuel.title}</h1>
        <p className="text-muted-foreground">{dict.typingDuel.desc}</p>
      </header>
      <TypingDuelGame />
    </div>
  );
}
