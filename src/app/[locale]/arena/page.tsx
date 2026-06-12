import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Gauge, Heart, Link2, Skull, Target, Timer, Trophy } from 'lucide-react';
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

  // Live modes link to /arena/[mode]; rules live in core/arena/modes.ts.
  const modes = [
    { slug: 'sprint', icon: Gauge, title: dict.arena.sprintTitle, desc: dict.arena.sprintDesc },
    {
      slug: 'time-attack',
      icon: Timer,
      title: dict.arena.timeAttackTitle,
      desc: dict.arena.timeAttackDesc,
    },
    {
      slug: 'survival',
      icon: Heart,
      title: dict.arena.survivalTitle,
      desc: dict.arena.survivalDesc,
    },
    {
      slug: 'boss-rush',
      icon: Skull,
      title: dict.arena.bossRushTitle,
      desc: dict.arena.bossRushDesc,
    },
    {
      slug: 'combo-rush',
      icon: Link2,
      title: dict.arena.comboRushTitle,
      desc: dict.arena.comboRushDesc,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">{dict.arena.title}</h1>
        <p className="text-muted-foreground">{dict.arena.subtitle}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modes.map((mode) => (
          <Link key={mode.slug} href={`/${locale}/arena/${mode.slug}`}>
            <Card className="h-full border-primary/50 transition-colors hover:border-primary">
              <CardHeader>
                <mode.icon className="size-7 text-primary" aria-hidden />
                <CardTitle>{mode.title}</CardTitle>
                <CardDescription>{mode.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}

        <Link href={`/${locale}/arena/leaderboard`}>
          <Card className="h-full transition-colors hover:border-primary">
            <CardHeader>
              <Trophy className="size-7 text-warning" aria-hidden />
              <CardTitle>{dict.leaderboard.title}</CardTitle>
              <CardDescription>{dict.leaderboard.subtitle}</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Card className="h-full opacity-60">
          <CardHeader>
            <Target className="size-7 text-muted-foreground" aria-hidden />
            <CardTitle>{dict.arena.reactionTitle}</CardTitle>
            <Badge variant="muted" className="w-fit">
              {dict.arena.comingSoon}
            </Badge>
          </CardHeader>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">{dict.arena.modesLockedNote}</p>
    </div>
  );
}
