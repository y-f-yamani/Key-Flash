'use client';

import { ProgressBar } from '@/components/ui/progress-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatTile } from '@/components/shared/stat-tile';
import { registry } from '@/content';
import { dateKeyInTimeZone, effectiveStreak, levelProgress } from '@/core/gamification';
import { mastery, useProgress } from '@/features/progress';
import { useI18n } from '@/lib/i18n/provider';
import { useNow } from '@/lib/use-now';

/** Read-only analytics over local progress: totals, streak, per-category mastery. */
export function StatsDashboard({ domainSlug }: { domainSlug: string }) {
  const { locale, dict } = useI18n();
  const { ready, state } = useProgress();
  const now = useNow();
  const domain = registry.getDomain(domainSlug);

  if (!ready || !domain) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;

  const cards = Object.values(state.cards);
  const attempts = cards.reduce((sum, c) => sum + c.attempts, 0);
  const correct = cards.reduce((sum, c) => sum + c.correct, 0);
  const progress = levelProgress(state.totalXp);
  const todayKey = dateKeyInTimeZone(now, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const streak = effectiveStreak(state.streak, todayKey);

  if (attempts === 0) {
    return <p className="text-muted-foreground">{dict.stats.noData}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={dict.common.level} value={progress.level} />
        <StatTile label={dict.stats.totalXp} value={state.totalXp.toLocaleString(locale)} />
        <StatTile
          label={dict.common.streak}
          value={`${streak} ${streak === 1 ? dict.common.day : dict.common.days}`}
        />
        <StatTile
          label={dict.stats.avgAccuracy}
          value={`${Math.round((correct / attempts) * 100)}%`}
          hint={`${dict.stats.shortcutsSeen}: ${cards.length}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dict.stats.byCategory}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {domain.categories.map((category) => {
            const ids = registry
              .shortcutsInCategory(domainSlug, category.id)
              .map((s) => s.id);
            const value = mastery(state, ids);
            return (
              <div key={category.id} className="flex items-center gap-3">
                <span className="w-48 shrink-0 text-sm">{category.name[locale]}</span>
                <ProgressBar value={value} className="flex-1" label={category.name[locale]} />
                <span className="w-10 text-end text-xs tabular-nums text-muted-foreground">
                  {Math.round(value * 100)}%
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
