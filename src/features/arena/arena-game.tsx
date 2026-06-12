'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Timer, Trophy, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatTile } from '@/components/shared/stat-tile';
import { registry } from '@/content';
import { createRng, getMode, isRunOver, livesLeft, pickPrompt } from '@/core/arena';
import type { ShortcutDefinition } from '@/core/content';
import { pointsForAnswer, type DrillEvent, type SprintResult } from '@/core/scoring';
import { useOptionalAuth } from '@/features/auth/provider';
import { useProgress } from '@/features/progress';
import { useKeyCapture } from '@/features/practice/use-key-capture';
import { useI18n } from '@/lib/i18n/provider';
import type { Dictionary } from '@/lib/i18n';
import { submitSprintRun } from './submit-run';

type Phase = 'idle' | 'running' | 'finished';

interface FinishedRun {
  result: SprintResult;
  isRecord: boolean;
  xpEarned: number;
}

/** Dictionary keys per mode — content stays in the i18n layer. */
export function modeCopy(dict: Dictionary, slug: string): { title: string; desc: string } {
  const arena = dict.arena;
  switch (slug) {
    case 'time-attack':
      return { title: arena.timeAttackTitle, desc: arena.timeAttackDesc };
    case 'survival':
      return { title: arena.survivalTitle, desc: arena.survivalDesc };
    case 'boss-rush':
      return { title: arena.bossRushTitle, desc: arena.bossRushDesc };
    case 'combo-rush':
      return { title: arena.comboRushTitle, desc: arena.comboRushDesc };
    default:
      return { title: arena.sprintTitle, desc: arena.sprintDesc };
  }
}

/**
 * Mode-agnostic arena game. All mode behavior (clock, lives, target count,
 * prompt pool, scoring) comes from `rules` (core/arena/modes.ts) — adding a
 * mode is a rules entry plus dictionary copy, not a new game component.
 */
export function ArenaGame({ mode, domainSlug }: { mode: string; domainSlug: string }) {
  const { dict, locale } = useI18n();
  const { ready, state, completeSprint } = useProgress();
  const auth = useOptionalAuth();
  const signedIn = Boolean(auth?.session);
  // The route validated the slug; rules resolve client-side because they
  // contain functions and cannot cross the RSC boundary.
  const rules = getMode(mode) ?? getMode('sprint')!;
  const copy = modeCopy(dict, rules.slug);

  const pool = useMemo(
    () =>
      (registry.getDomain(domainSlug)?.shortcuts ?? []).filter(
        (s) => s.capturable !== 'none' && s.difficulty >= rules.minDifficulty,
      ),
    [domainSlug, rules.minDifficulty],
  );

  const [phase, setPhase] = useState<Phase>('idle');
  const [prompt, setPrompt] = useState<ShortcutDefinition | null>(null);
  const [clockMs, setClockMs] = useState<number>(rules.timeLimitMs ?? 0);
  const [liveScore, setLiveScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [events, setEvents] = useState<readonly DrillEvent[]>([]);
  const [finished, setFinished] = useState<FinishedRun | null>(null);

  const rngRef = useRef(createRng(0));
  const eventsRef = useRef<DrillEvent[]>([]);
  const startAtRef = useRef(0);
  const comboRef = useRef(0);
  const finishedRef = useRef(false);

  const finishRun = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const timeline = eventsRef.current;
    const result = rules.score(timeline);
    const { isRecord, xpEarned } = completeSprint(rules.slug, result);
    setFinished({ result, isRecord, xpEarned });
    setPhase('finished');
    if (signedIn && timeline.length > 0) {
      const durationMs =
        rules.timeLimitMs ?? Math.max(1, Math.round(performance.now() - startAtRef.current));
      void submitSprintRun({ domain: domainSlug, mode: rules.slug, durationMs, events: timeline });
    }
  }, [rules, completeSprint, signedIn, domainSlug]);

  const start = useCallback(() => {
    rngRef.current = createRng(Date.now());
    eventsRef.current = [];
    comboRef.current = 0;
    finishedRef.current = false;
    startAtRef.current = performance.now();
    setLiveScore(0);
    setCombo(0);
    setEvents([]);
    setClockMs(rules.timeLimitMs ?? 0);
    setFinished(null);
    setPrompt(pickPrompt(pool, rngRef.current, null));
    setPhase('running');
  }, [pool, rules.timeLimitMs]);

  // Clock: counts down for timed modes, up for untimed ones.
  useEffect(() => {
    if (phase !== 'running') return;
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - startAtRef.current;
      setClockMs(rules.timeLimitMs !== null ? Math.max(0, rules.timeLimitMs - elapsed) : elapsed);
      if (isRunOver(rules, eventsRef.current, elapsed)) {
        window.clearInterval(interval);
        finishRun();
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [phase, rules, finishRun]);

  const handleAnswer = useCallback(
    ({ correct, reactionMs: reaction }: { correct: boolean; reactionMs: number }) => {
      if (phase !== 'running' || !prompt || finishedRef.current) return;
      const answeredAt = performance.now() - startAtRef.current;
      eventsRef.current.push({
        shortcutId: prompt.id,
        promptAt: answeredAt - reaction,
        answeredAt,
        correct,
      });
      setEvents([...eventsRef.current]);

      if (correct) {
        comboRef.current += 1;
        setLiveScore((score) => score + pointsForAnswer(reaction, comboRef.current));
      } else {
        comboRef.current = 0;
      }
      setCombo(comboRef.current);

      if (isRunOver(rules, eventsRef.current, answeredAt)) {
        finishRun();
        return;
      }
      setPrompt(pickPrompt(pool, rngRef.current, prompt.id));
    },
    [phase, prompt, pool, rules, finishRun],
  );

  useKeyCapture({
    keys: prompt?.keys ?? [],
    enabled: phase === 'running' && prompt !== null,
    onResult: handleAnswer,
  });

  if (!ready) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;

  if (phase === 'idle') {
    const best = state.bests[rules.slug];
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
          <h1 className="text-3xl font-extrabold">{copy.title}</h1>
          <p className="max-w-md text-muted-foreground">{copy.desc}</p>
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
          <p className="mt-1 text-sm text-muted-foreground">
            +{xpEarned} {dict.common.xp}
          </p>
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

  const lives = livesLeft(rules, events);
  return (
    <div className="flex flex-col gap-6" data-testid="sprint-running">
      <div className="flex items-center justify-between text-lg font-bold tabular-nums">
        <span className="inline-flex items-center gap-2" title={rules.timeLimitMs !== null ? dict.arena.timeLeft : dict.arena.elapsed}>
          <Timer className="size-5 text-accent" aria-hidden />
          {(clockMs / 1000).toFixed(1)}s
        </span>
        <span className="text-primary">
          {rules.targetCount !== null
            ? `${events.length} / ${rules.targetCount}`
            : liveScore.toLocaleString(locale)}
        </span>
        <span className="inline-flex items-center gap-2">
          {lives !== null && (
            <span className="inline-flex items-center gap-0.5" title={dict.arena.lives}>
              {Array.from({ length: lives }).map((_, i) => (
                <Heart key={i} className="size-4 fill-danger text-danger" aria-hidden />
              ))}
            </span>
          )}
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
