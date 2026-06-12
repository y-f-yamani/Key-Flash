'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatTile } from '@/components/shared/stat-tile';
import { KeycapBuddy } from '@/components/shared/keycap-buddy';
import { REACTION_RULES, createRng, roundDelayMs, scoreReaction, type Rng } from '@/core/arena';
import type { DrillEvent, SprintResult } from '@/core/scoring';
import { useOptionalAuth } from '@/features/auth/provider';
import { useProgress } from '@/features/progress';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { submitSprintRun } from './submit-run';

type Phase = 'idle' | 'waiting' | 'go' | 'false-start' | 'between' | 'finished';

interface FinishedRun {
  result: SprintResult;
  isRecord: boolean;
  xpEarned: number;
}

/**
 * Reaction Test: the screen arms red, flashes green after a seeded random
 * delay, and the player smashes Space. False starts repeat the round with a
 * score penalty. Pure timing logic lives in core/arena/reaction.ts.
 */
export function ReactionGame({ domainSlug }: { domainSlug: string }) {
  const { dict, locale } = useI18n();
  const { ready, state, completeSprint } = useProgress();
  const auth = useOptionalAuth();
  const signedIn = Boolean(auth?.session);

  const [phase, setPhase] = useState<Phase>('idle');
  const [cleanRounds, setCleanRounds] = useState(0);
  const [lastReactionMs, setLastReactionMs] = useState<number | null>(null);
  const [finished, setFinished] = useState<FinishedRun | null>(null);

  const rngRef = useRef<Rng | null>(null);
  const eventsRef = useRef<DrillEvent[]>([]);
  const startAtRef = useRef(0);
  const signalAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  // Mirror for the key listener — reads the latest phase without
  // re-subscribing on every transition.
  const phaseRef = useRef<Phase>('idle');
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const armRound = useCallback(() => {
    const rng = rngRef.current;
    if (!rng) return;
    setPhase('waiting');
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      signalAtRef.current = performance.now();
      setPhase('go');
    }, roundDelayMs(rng));
  }, []);

  const start = useCallback(() => {
    rngRef.current = createRng(Date.now());
    eventsRef.current = [];
    startAtRef.current = performance.now();
    setCleanRounds(0);
    setLastReactionMs(null);
    setFinished(null);
    armRound();
  }, [armRound]);

  const finishRun = useCallback(() => {
    const events = eventsRef.current;
    const result = scoreReaction(events);
    const { isRecord, xpEarned } = completeSprint('reaction', result);
    setFinished({ result, isRecord, xpEarned });
    setPhase('finished');
    if (signedIn && events.length > 0) {
      void submitSprintRun({
        domain: domainSlug,
        mode: 'reaction',
        durationMs: Math.max(1, Math.round(performance.now() - startAtRef.current)),
        events,
      });
    }
  }, [completeSprint, signedIn, domainSlug]);

  // Space drives every round; phaseRef avoids re-subscribing per phase.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space') return;
      const current = phaseRef.current;
      if (current !== 'waiting' && current !== 'go') return;
      event.preventDefault();

      const now = performance.now();
      if (current === 'waiting') {
        // Jumped the gun: no signal yet.
        clearTimer();
        eventsRef.current.push({
          shortcutId: 'reaction.space',
          promptAt: now - startAtRef.current - 1,
          answeredAt: now - startAtRef.current,
          correct: false,
        });
        setPhase('false-start');
        timerRef.current = window.setTimeout(armRound, 1_200);
        return;
      }

      const reaction = now - signalAtRef.current;
      eventsRef.current.push({
        shortcutId: 'reaction.space',
        promptAt: signalAtRef.current - startAtRef.current,
        answeredAt: now - startAtRef.current,
        correct: true,
      });
      setLastReactionMs(Math.round(reaction));
      setCleanRounds((rounds) => {
        const next = rounds + 1;
        if (next >= REACTION_RULES.rounds) {
          finishRun();
        } else {
          setPhase('between');
          timerRef.current = window.setTimeout(armRound, 900);
        }
        return next;
      });
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      clearTimer();
    };
  }, [armRound, finishRun]);

  if (!ready) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;

  if (phase === 'idle') {
    const best = state.bests['reaction'];
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
          <KeycapBuddy mood="focus" size={100} className="animate-bob" />
          <h1 className="text-3xl font-extrabold">{dict.arena.reactionTitle}</h1>
          <p className="max-w-md text-muted-foreground">{dict.arena.reactionDesc}</p>
          {best && (
            <Badge variant="accent">
              <Trophy className="size-3.5" /> {dict.common.bestScore}:{' '}
              <span className="tabular-nums">{best.score.toLocaleString(locale)}</span>
            </Badge>
          )}
          <Button size="lg" onClick={start} data-testid="start-reaction">
            {dict.arena.startRun}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'finished' && finished) {
    const { result, isRecord, xpEarned } = finished;
    return (
      <div className="flex flex-col gap-6" data-testid="reaction-results">
        <KeycapBuddy
          mood={isRecord ? 'cheer' : 'happy'}
          size={110}
          className="mx-auto animate-pop"
        />
        {isRecord && (
          <Badge variant="success" className="mx-auto px-4 py-1.5 text-sm">
            <Trophy className="size-4" /> {dict.arena.newRecord}
          </Badge>
        )}
        <div className="text-center">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {dict.common.avgReaction}
          </p>
          <p className="text-6xl font-extrabold tabular-nums text-primary">
            {result.avgReactionMs} ms
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {dict.common.score}: {result.score.toLocaleString(locale)} · +{xpEarned}{' '}
            {dict.common.xp}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label={dict.common.accuracy}
            value={`${Math.round(result.accuracy * 100)}%`}
          />
          <StatTile label={dict.arena.falseStarts} value={result.total - result.correct} />
          <StatTile
            label={dict.common.consistency}
            value={`${Math.round(result.consistency * 100)}%`}
          />
        </div>
        <Button size="lg" className="mx-auto" onClick={start}>
          {dict.arena.runAgain}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="reaction-running">
      <div className="flex items-center justify-between text-lg font-bold tabular-nums">
        <span>
          {dict.arena.round} {Math.min(cleanRounds + 1, REACTION_RULES.rounds)} /{' '}
          {REACTION_RULES.rounds}
        </span>
        {lastReactionMs !== null && (
          <span className="inline-flex items-center gap-1 text-primary">
            <Zap className="size-5" aria-hidden /> {lastReactionMs} ms
          </span>
        )}
      </div>
      <button
        type="button"
        className={cn(
          'flex min-h-72 cursor-default flex-col items-center justify-center gap-3 rounded-xl text-2xl font-extrabold text-white transition-colors duration-150',
          phase === 'waiting' && 'bg-danger/90',
          phase === 'go' && 'bg-success',
          phase === 'false-start' && 'bg-warning',
          phase === 'between' && 'bg-muted text-foreground',
        )}
        data-testid={`reaction-${phase}`}
        tabIndex={-1}
      >
        {phase === 'waiting' && dict.arena.waitGreen}
        {phase === 'go' && dict.arena.pressNow}
        {phase === 'false-start' && dict.arena.tooSoon}
        {phase === 'between' && `${lastReactionMs} ms`}
      </button>
    </div>
  );
}
