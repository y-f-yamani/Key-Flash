import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TypingGame } from '@/features/typing/typing-game';
import { getDictionary, isLocale } from '@/lib/i18n';

export default async function TypingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">{dict.typing.title}</h1>
          <p className="text-muted-foreground">{dict.typing.subtitle}</p>
        </div>
        <Link href={`/${locale}/typing/duel`}>
          <Button variant="outline">
            <Swords className="size-4 text-danger" /> {dict.typingDuel.cta}
          </Button>
        </Link>
      </header>
      <TypingGame />
    </div>
  );
}
