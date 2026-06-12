'use client';

import { Flame, Zap } from 'lucide-react';
import { effectiveStreak, levelProgress, dateKeyInTimeZone } from '@/core/gamification';
import { useProgress } from '@/features/progress';
import { useI18n } from '@/lib/i18n/provider';
import { useNow } from '@/lib/use-now';

/** Compact header widget: level, XP progress and current streak. */
export function PlayerChip() {
  const { dict } = useI18n();
  const { ready, state } = useProgress();
  const now = useNow();
  if (!ready) return <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />;

  const progress = levelProgress(state.totalXp);
  const todayKey = dateKeyInTimeZone(now, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const streak = effectiveStreak(state.streak, todayKey);

  return (
    <div className="flex items-center gap-3 text-sm font-semibold">
      <span className="inline-flex items-center gap-1" title={dict.common.level}>
        <Zap className="size-4 text-primary" aria-hidden />
        {dict.common.level} {progress.level}
      </span>
      <span
        className="inline-flex items-center gap-1 tabular-nums"
        title={`${dict.common.streak}`}
      >
        <Flame className={`size-4 ${streak > 0 ? 'text-warning' : 'text-muted-foreground'}`} aria-hidden />
        {streak}
      </span>
    </div>
  );
}
