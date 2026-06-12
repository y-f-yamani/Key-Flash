'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Timer, Trophy, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatTile } from '@/components/shared/stat-tile';
import { registry } from '@/content';
import { createRng, pickPrompt, type Rng } from '@/core/arena';
import type { ShortcutDefinition } from '@/core/content';
import {
  SPRINT_RULES,
  pointsForAnswer,
  scoreSprint,
  type DrillEvent,
  type SprintResult,
} from '@/core/scoring';
import { useProgress } from '@/features/progress';
import { useKeyCapture } from '@/features/practice/use-key-capture';
import { useI18n } from '@/lib/i18n/provider';

type Phase = 'idle' | 'running' | 'finished';

interface FinishedRun {
  result: SprintResult;
  isRecord: boolean;
  xpEarned: number;
}

/**
 * Shortcut Sprint: 60 seconds, as many shortcuts as possible, combo-multiplied
 * scoring (core/scoring/sprint.ts). Only capturable shortcuts appear — recall
 * quizzes have no place in a speed mode.
 */
export function SprintGame({ domainSlug }: { domainSlug: string }) {
  const { dict, locale } = useI18n();
  const { ready, state, completeSprint } = useProgress();

  const pool = useMemo(
    () =>
      (registry.getDomain(domainSlug)?.shortcuts ?? []).filter(
        (s) => s.capturable !== 'none',
      ),
    [domainSlug],
  );

  const [phase, setPhase] = useState<Phase>('idle');
  const [prompt, setPrompt] = useState<ShortcutDefinition | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(SPRINT_RULES.durationMs);
  const [liveScore, setLiveScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [finished, setFinished] = useState<FinishedRun | null>(null);

  // Created lazily in start() — render stays pure (no Date.now() during render).
  const rngRef = useRef<Rng | null>(null);
  const eventsRef = useRef<DrillEvent[]>([]);
  const startAtRef = useRef(0);
  const comboRef = useRef(0);

  const start = useCallback(() => {
    const rng = createRng(Date.now());
    rngRef.current = rng;
    eventsRef.current = [];
    comboRef.current = 0;
    startAtRef.current = performance.now();
    setLiveScore(0);
    setCombo(0);
    setTimeLeftMs(SPRINT_RULES.durationMs);
    setFinished(null);
    setPrompt(pickPrompt(pool, rng, null));
    setPhase('running');
  }, [pool]);

  // Countdown clock; ends the run when time is up.
  useEffect(() => {
    if (phase !== 'running') return;
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - startAtRef.current;
      const remaining = Math.max(0, SPRINT_RULES.durationMs - elapsed);
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        const result = scoreSprint(eventsRef.current);
        const { isRecord, xpEarned } = completeSprint('sprint', result);
        setFinished({ result, isRecord, xpEarned });
        setPhase('finished');
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [phase, completeSprint]);

  const handleAnswer = useCallback(
    ({ correct, reactionMs }: { correct: boolean; reactionMs: number }) => {
      const rng = rngRef.current;
      if (phase !== 'running' || !prompt || !rng) return;
      const answeredAt = performance.now() - startAtRef.current;
      eventsRef.current.push({
        shortcutId: prompt.id,
        promptAt: answeredAt - reactionMs,
        answeredAt,
        correct,
      });

      if (correct) {
        comboRef.current += 1;
        setLiveScore((score) => score + pointsForAnswer(reactionMs, comboRef.current));
      } else {
        comboRef.current = 0;
      }
      setCombo(comboRef.current);
      setPrompt(pickPrompt(pool, rng, prompt.id));
    },
    [phase, prompt, pool],
  );

  useKeyCapture({
    keys: prompt?.keys ?? [],
    enabled: phase === 'running' && prompt !== null,
    onResult: handleAnswer,
  });

  if (!ready) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;

  if (phase === 'idle') {
    const best = state.bests['sprint'];
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
          <h1 className="text-3xl font-extrabold">{dict.arena.sprintTitle}</h1>
          <p className="max-w-md text-muted-foreground">{dict.arena.sprintDesc}</p>
          {best && (
            <Badge variant="accent">
              <Trophy className="size-3.5" /> {dict.common.bestScore}:{' '}
              <span className="tabular-nums">{best.score.toLocaleString(locale)}</span>
            </Badge>
          )}
          <Button size="lg" onClick={start} data-testid="start-sprint">
            {dict.arena.startRun}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'finished' && finished) {
    const { result, isRecord, xpEarned } = finished;
    return (
      <div className="flex flex-col gap-6" data-testid="sprint-results">
        {isRecord && (
          <Badge variant="success" className="mx-auto px-4 py-1.5 text-sm">
            <Trophy className="size-4" /> {dict.arena.newRecord}
          </Badge>
        )}
        <div className="text-center">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {dict.arena.finalScore}
          </p>
          <p className="text-6xl font-extrabold tabular-nums text-primary">
            {result.score.toLocaleString(locale)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">+{xpEarned} {dict.common.xp}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={dict.common.accuracy}
            value={`${Math.round(result.accuracy * 100)}%`}
            hint={`${result.correct} / ${result.total}`}
          />
          <StatTile label={dict.common.avgReaction} value={`${result.avgReactionMs} ms`} />
          <StatTile
            label={dict.common.consistency}
            value={`${Math.round(result.consistency * 100)}%`}
          />
          <StatTile label={dict.common.maxCombo} value={`×${result.maxCombo}`} />
        </div>
        <Button size="lg" className="mx-auto" onClick={start}>
          {dict.arena.runAgain}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="sprint-running">
      <div className="flex items-center justify-between text-lg font-bold tabular-nums">
        <span className="inline-flex items-center gap-2">
          <Timer className="size-5 text-accent" aria-hidden />
          {(timeLeftMs / 1000).toFixed(1)}s
        </span>
        <span className="text-primary">{liveScore.toLocaleString(locale)}</span>
        <span className="inline-flex items-center gap-1">
          <Zap
            className={`size-5 ${combo >= 3 ? 'text-warning' : 'text-muted-foreground'}`}
            aria-hidden
          />
          ×{combo}
        </span>
      </div>
      {prompt && (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
            <h2 className="text-3xl font-extrabold">{prompt.name[locale]}</h2>
            <p className="text-muted-foreground">{prompt.description[locale]}</p>
          </CardContent>
        </Card>
      )}
      <p className="text-center text-xs text-muted-foreground">{dict.practice.metaRemapNote}</p>
    </div>
  );
}
