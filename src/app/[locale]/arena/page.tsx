import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Gauge, Heart, Skull, Swords, Target, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDictionary, isLocale } from '@/lib/i18n';

export default async function ArenaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  // Mode metadata only — each mode's rules live in core when implemented.
  const upcoming = [
    { icon: Timer, name: 'Time Attack' },
    { icon: Heart, name: 'Survival' },
    { icon: Skull, name: 'Boss Rush' },
    { icon: Swords, name: 'Combo Rush' },
    { icon: Target, name: 'Reaction Test' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">{dict.arena.title}</h1>
        <p className="text-muted-foreground">{dict.arena.subtitle}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href={`/${locale}/arena/sprint`}>
          <Card className="h-full border-primary/50 transition-colors hover:border-primary">
            <CardHeader>
              <Gauge className="size-7 text-primary" aria-hidden />
              <CardTitle>{dict.arena.sprintTitle}</CardTitle>
              <CardDescription>{dict.arena.sprintDesc}</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {upcoming.map((mode) => (
          <Card key={mode.name} className="h-full opacity-60">
            <CardHeader>
              <mode.icon className="size-7 text-muted-foreground" aria-hidden />
              <CardTitle>{mode.name}</CardTitle>
              <Badge variant="muted" className="w-fit">
                {dict.arena.comingSoon}
              </Badge>
            </CardHeader>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{dict.arena.modesLockedNote}</p>
    </div>
  );
}
