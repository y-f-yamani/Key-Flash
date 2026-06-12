'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Timer, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatTile } from '@/components/shared/stat-tile';
import { KeycapBuddy } from '@/components/shared/keycap-buddy';
import { createRng } from '@/core/arena';
import type { SprintResult } from '@/core/scoring';
import {
  applyKey,
  createSession,
  extendTarget,
  sessionStats,
  type TypingSession,
} from '@/core/typing';
import { generateWords } from '@/content/typing/words';
import { useProgress } from '@/features/progress';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

const DURATIONS_SEC = [30, 60] as const;
const INITIAL_WORDS = 60;
const TOP_UP_WORDS = 30;
/** Top up the target when fewer than this many untyped chars remain. */
const TOP_UP_THRESHOLD = 120;

type Phase = 'idle' | 'running' | 'finished';

interface FinishedTest {
  result: SprintResult;
  isRecord: boolean;
  xpEarned: number;
}

/**
 * Monkeytype-style touch-typing test. The engine is pure (core/typing);
 * this component owns only the clock, the key listener and rendering.
 * Personal bests are stored per duration ("typing-30", "typing-60") through
 * the same progress pipeline as arena modes.
 */
export function TypingGame() {
  const { locale, dict } = useI18n();
  const { ready, state, completeSprint } = useProgress();

  const [durationSec, setDurationSec] = useState<(typeof DURATIONS_SEC)[number]>(30);
  const [phase, setPhase] = useState<Phase>('idle');
  const [session, setSession] = useState<TypingSession | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(30_000);
  const [finished, setFinished] = useState<FinishedTest | null>(null);

  // Mirror for the clock interval — it reads the latest session without
  // re-subscribing on every keystroke.
  const sessionRef = useRef<TypingSession | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const rngRef = useRef(createRng(0));
  const finishedRef = useRef(false);

  const start = useCallback(() => {
    rngRef.current = createRng(Date.now());
    const target = generateWords(rngRef.current, locale, INITIAL_WORDS);
    finishedRef.current = false;
    setSession(createSession(target));
    setFinished(null);
    setTimeLeftMs(durationSec * 1000);
    setPhase('running');
  }, [locale, durationSec]);

  const finishTest = useCallback(() => {
    const current = sessionRef.current;
    if (finishedRef.current || !current || current.startedAt === null) return;
    finishedRef.current = true;
    const stats = sessionStats(current, current.startedAt + durationSec * 1000);
    const result: SprintResult = {
      score: Math.round(stats.netWpm),
      accuracy: stats.accuracy,
      avgReactionMs: stats.avgGapMs,
      consistency: stats.consistency,
      maxCombo: current.bestStreak,
      correct: current.correctKeystrokes,
      total: current.keystrokes,
    };
    const { isRecord, xpEarned } = completeSprint(`typing-${durationSec}`, result);
    setFinished({ result, isRecord, xpEarned });
    setPhase('finished');
  }, [durationSec, completeSprint]);

  // Clock: starts with the first keystroke (session.startedAt), ticks to 0.
  useEffect(() => {
    if (phase !== 'running') return;
    const interval = window.setInterval(() => {
      const current = sessionRef.current;
      if (!current?.startedAt) return;
      const remaining = Math.max(0, durationSec * 1000 - (performance.now() - current.startedAt));
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        finishTest();
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [phase, durationSec, finishTest]);

  // Key listener: printable chars + Backspace feed the pure engine.
  useEffect(() => {
    if (phase !== 'running') return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key !== 'Backspace' && event.key.length !== 1) return;
      event.preventDefault(); // space must not scroll, Backspace must not navigate

      setSession((current) => {
        if (!current) return current;
        let next = applyKey(current, event.key, performance.now());
        if (next.target.length - next.position < TOP_UP_THRESHOLD) {
          next = extendTarget(next, ' ' + generateWords(rngRef.current, locale, TOP_UP_WORDS));
        }
        return next;
      });
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [phase, locale]);

  if (!ready) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;

  if (phase === 'idle') {
    const best = state.bests[`typing-${durationSec}`];
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
          <Keyboard className="size-8 text-primary" aria-hidden />
          <h1 className="text-3xl font-extrabold">{dict.typing.title}</h1>
          <p className="max-w-md text-muted-foreground">{dict.typing.subtitle}</p>
          <div className="flex items-center gap-2" role="group" aria-label={dict.typing.duration}>
            {DURATIONS_SEC.map((seconds) => (
              <Button
                key={seconds}
                variant={durationSec === seconds ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setDurationSec(seconds)}
              >
                {seconds}s
              </Button>
            ))}
          </div>
          {best && (
            <Badge variant="accent">
              <Trophy className="size-3.5" /> {dict.typing.bestWpm}:{' '}
              <span className="tabular-nums">{best.score}</span>
            </Badge>
          )}
          <Button size="lg" onClick={start} data-testid="start-typing">
            {dict.typing.start}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'finished' && finished) {
    const { result, isRecord, xpEarned } = finished;
    return (
      <div className="flex flex-col gap-6" data-testid="typing-results">
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
            {dict.typing.wpm}
          </p>
          <p className="text-6xl font-extrabold tabular-nums text-primary">{result.score}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            +{xpEarned} {dict.common.xp}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={dict.common.accuracy}
            value={`${Math.round(result.accuracy * 100)}%`}
            hint={`${dict.typing.keystrokes}: ${result.total}`}
          />
          <StatTile
            label={dict.typing.rawWpm}
            value={result.total > 0 ? Math.round(result.total / 5 / (durationSec / 60)) : 0}
          />
          <StatTile
            label={dict.common.consistency}
            value={`${Math.round(result.consistency * 100)}%`}
          />
          <StatTile label={dict.typing.bestStreak} value={`×${result.maxCombo}`} />
        </div>
        <Button size="lg" className="mx-auto" onClick={start}>
          {dict.typing.tryAgain}
        </Button>
      </div>
    );
  }

  const liveStats = session?.startedAt
    ? sessionStats(session, session.lastKeyAt ?? session.startedAt)
    : null;

  return (
    <div className="flex flex-col gap-6" data-testid="typing-running">
      <div className="flex items-center justify-between text-lg font-bold tabular-nums">
        <span className="inline-flex items-center gap-2">
          <Timer className="size-5 text-accent" aria-hidden />
          {(timeLeftMs / 1000).toFixed(0)}s
        </span>
        <span className="text-primary">
          {liveStats ? `${Math.round(liveStats.netWpm)} ${dict.typing.wpm}` : dict.typing.typeToBegin}
        </span>
        <span className="text-muted-foreground">
          {liveStats ? `${Math.round(liveStats.accuracy * 100)}%` : ''}
        </span>
      </div>
      {session && <TypingText session={session} locale={locale} />}
    </div>
  );
}

/** The text being typed: correct/wrong/pending chars with a caret. */
function TypingText({ session, locale }: { session: TypingSession; locale: string }) {
  // Render a window around the caret, not the endless target.
  const WINDOW = 360;
  const start = Math.max(0, session.position - 120);
  const visible = session.target.slice(start, start + WINDOW);

  return (
    <Card>
      <CardContent
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        className="select-none p-6 font-mono text-xl leading-relaxed tracking-wide"
        data-testid="typing-text"
      >
        {[...visible].map((char, i) => {
          const index = start + i;
          const typed = index < session.position ? session.chars[index] : null;
          const isCaret = index === session.position;
          return (
            <span
              key={index}
              className={cn(
                typed === null && 'text-muted-foreground',
                typed?.correct === true && 'text-foreground',
                typed?.correct === false && 'bg-danger/20 text-danger',
                isCaret && 'animate-pulse rounded-sm bg-primary/30',
              )}
            >
              {char}
            </span>
          );
        })}
      </CardContent>
    </Card>
  );
}
