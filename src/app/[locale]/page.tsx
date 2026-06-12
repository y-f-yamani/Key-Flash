import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Swords, Brain, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyCombo } from '@/components/shared/key-combo';
import { registry } from '@/content';
import { parseChord } from '@/core/keyboard';
import { LOCALES, getDictionary, isLocale } from '@/lib/i18n';

const HERO_COMBO = [parseChord('Win+Shift+S')];

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const domain = registry.getDomain('win11');
  const shortcutCount = domain?.shortcuts.length ?? 0;
  const categoryCount = domain?.categories.length ?? 0;

  const features = [
    { icon: Keyboard, title: dict.landing.featureLearnTitle, body: dict.landing.featureLearnBody },
    { icon: Brain, title: dict.landing.featureSrsTitle, body: dict.landing.featureSrsBody },
    { icon: Swords, title: dict.landing.featureArenaTitle, body: dict.landing.featureArenaBody },
  ];

  return (
    <div className="flex flex-col gap-16 py-8">
      <section className="flex flex-col items-center gap-6 text-center">
        <KeyCombo keys={HERO_COMBO} size="lg" />
        <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-tight md:text-6xl">
          {dict.landing.heroTitle}
        </h1>
        <p className="max-w-2xl text-pretty text-lg text-muted-foreground">
          {dict.landing.heroSubtitle}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href={`/${locale}/learn`}>
            <Button size="lg">{dict.landing.ctaStart}</Button>
          </Link>
          <Link href={`/${locale}/arena`}>
            <Button size="lg" variant="outline">
              {dict.landing.ctaArena}
            </Button>
          </Link>
        </div>
        <dl className="flex gap-8 text-sm text-muted-foreground">
          <div>
            <dt className="text-2xl font-bold text-foreground">{shortcutCount}</dt>
            <dd>{dict.landing.statShortcuts}</dd>
          </div>
          <div>
            <dt className="text-2xl font-bold text-foreground">{categoryCount}</dt>
            <dd>{dict.landing.statCategories}</dd>
          </div>
          <div>
            <dt className="text-2xl font-bold text-foreground">2</dt>
            <dd>{dict.landing.statLanguages}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <feature.icon className="size-7 text-primary" aria-hidden />
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
  );
}
