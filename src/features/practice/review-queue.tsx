'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { registry } from '@/content';
import { dueShortcutIds, useProgress } from '@/features/progress';
import { useI18n } from '@/lib/i18n/provider';
import { useNow } from '@/lib/use-now';
import { DrillSession } from './drill-session';

const MAX_REVIEWS_PER_SESSION = 10;

/**
 * The SRS review surface: shows what is due, runs a drill session over it.
 * Due cards are snapshotted when the session starts so finishing one drill
 * doesn't reshuffle the queue mid-session.
 */
export function ReviewQueue() {
  const { locale, dict } = useI18n();
  const { ready, state } = useProgress();
  const now = useNow();
  const [sessionIds, setSessionIds] = useState<string[] | null>(null);

  if (!ready) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;

  if (sessionIds !== null) {
    const shortcuts = sessionIds
      .map((id) => registry.getShortcut(id))
      .filter((s) => s !== undefined);
    return (
      <DrillSession
        shortcuts={shortcuts}
        completeAction={{ label: dict.common.done, onClick: () => setSessionIds(null) }}
      />
    );
  }

  const due = dueShortcutIds(state, now);

  if (due.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <CheckCircle2 className="size-10 text-success" aria-hidden />
          <h2 className="text-2xl font-bold">{dict.practice.allDoneTitle}</h2>
          <p className="text-muted-foreground">{dict.practice.allDoneBody}</p>
          <Link href={`/${locale}/learn`}>
            <Button variant="outline">{dict.nav.learn}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="text-5xl font-extrabold tabular-nums text-primary">{due.length}</span>
        <p className="text-muted-foreground">{dict.practice.dueNow}</p>
        <Button
          size="lg"
          onClick={() => setSessionIds(due.slice(0, MAX_REVIEWS_PER_SESSION))}
          data-testid="start-review"
        >
          {dict.practice.reviewNow}
        </Button>
      </CardContent>
    </Card>
  );
}
