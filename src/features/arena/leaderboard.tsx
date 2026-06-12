'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useOptionalAuth } from '@/features/auth/provider';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';

interface Entry {
  username: string;
  display_name: string;
  score: number;
  accuracy: number;
  created_at: string;
}

type State = { kind: 'loading' } | { kind: 'ready'; entries: Entry[] } | { kind: 'unavailable' };

/** Global top runs via the security-definer `leaderboard()` function. */
export function Leaderboard({ domainSlug, mode }: { domainSlug: string; mode: string }) {
  const { locale, dict } = useI18n();
  const auth = useOptionalAuth();
  const [state, setState] = useState<State>(() =>
    getBrowserSupabase() ? { kind: 'loading' } : { kind: 'unavailable' },
  );

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    supabase
      .rpc('leaderboard', { p_domain: domainSlug, p_mode: mode, p_limit: 50 })
      .then(({ data, error }) => {
        if (cancelled) return;
        setState(error ? { kind: 'unavailable' } : { kind: 'ready', entries: data ?? [] });
      });
    return () => {
      cancelled = true;
    };
  }, [domainSlug, mode]);

  if (state.kind === 'loading') {
    return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  }

  if (state.kind === 'unavailable') {
    return <p className="text-muted-foreground">{dict.leaderboard.empty}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {!auth?.session && auth?.cloudEnabled && (
        <Badge variant="accent" className="w-fit">
          {dict.leaderboard.signInToCompete}
        </Badge>
      )}
      <Card>
        <CardContent className="p-0">
          {state.entries.length === 0 ? (
            <p className="p-6 text-muted-foreground">{dict.leaderboard.empty}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 text-start">{dict.leaderboard.rank}</th>
                  <th className="p-3 text-start">{dict.leaderboard.player}</th>
                  <th className="p-3 text-end">{dict.common.score}</th>
                  <th className="p-3 text-end">{dict.common.accuracy}</th>
                </tr>
              </thead>
              <tbody>
                {state.entries.map((entry, index) => (
                  <tr key={`${entry.username}-${index}`} className="border-b border-border last:border-0">
                    <td className="p-3 font-bold tabular-nums">
                      {index < 3 ? <Trophy className="inline size-4 text-warning" /> : null}{' '}
                      {index + 1}
                    </td>
                    <td className="p-3">{entry.display_name || entry.username}</td>
                    <td className="p-3 text-end font-semibold tabular-nums">
                      {entry.score.toLocaleString(locale)}
                    </td>
                    <td className="p-3 text-end tabular-nums">
                      {Math.round(entry.accuracy * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
