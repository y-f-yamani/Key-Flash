'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Keyboard, Loader2, Timer, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KeycapBuddy } from '@/components/shared/keycap-buddy';
import { tierFor } from '@/core/rating';
import { applyKey, createSession, sessionStats, type TypingSession } from '@/core/typing';
import { useOptionalAuth } from '@/features/auth/provider';
import { TypingText } from '@/features/typing/typing-game';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { fetchMatch, joinQueue, leaveQueue, submitDuel } from './match-client';
import type { MatchView } from './schemas';
import { TYPING_DUEL_RULES, duelTypingTarget } from './validate-typing';

type Phase = 'idle' | 'searching' | 'countdown' | 'playing' | 'waiting' | 'finished' | 'abandoned';

const COUNTDOWN_MS = 3_000;
const POLL_MS = 2_000;
/** Live opponent-text broadcast cadence (small payload, smooth enough). */
const BROADCAST_MS = 200;

interface OpponentLive {
  typed: string;
  wpm: number;
}

/**
 * Ranked typing duel: both players type the IDENTICAL seeded text for 45
 * seconds while watching each other's pane update live — every keystroke the
 * opponent makes appears on your screen (and yours on theirs). The server
 * replays both raw keystroke logs and is the only judge.
 */
export function TypingDuelGame() {
  const { locale, dict } = useI18n();
  const auth = useOptionalAuth();
  const signedIn = Boolean(auth?.session);
  const myUserId = auth?.session?.user.id ?? '';

  const [phase, setPhase] = useState<Phase>('idle');
  const [match, setMatch] = useState<MatchView | null>(null);
  const [clock, setClock] = useState(0);
  const [session, setSession] = useState<TypingSession | null>(null);
  const [opponent, setOpponent] = useState<OpponentLive>({ typed: '', wpm: 0 });

  const sessionRef = useRef<TypingSession | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const keystrokesRef = useRef<{ key: string; at: number }[]>([]);
  const targetRef = useRef('');
  const playStartRef = useRef(0);
  const submittedRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const phaseRef = useRef<Phase>('idle');
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ── lifecycle ────────────────────────────────────────────────────────────

  const search = useCallback(async () => {
    setPhase('searching');
    setOpponent({ typed: '', wpm: 0 });
    setSession(null);
    submittedRef.current = false;
    keystrokesRef.current = [];
    const joined = await joinQueue('typing');
    if (!joined) {
      setPhase('idle');
      return;
    }
    setMatch((current) =>
      current?.id === joined.matchId ? current : ({ id: joined.matchId } as MatchView),
    );
  }, []);

  const cancel = useCallback(async () => {
    await leaveQueue();
    setMatch(null);
    setPhase('idle');
  }, []);

  const beginCountdown = useCallback((view: MatchView) => {
    targetRef.current = duelTypingTarget(view.seed);
    keystrokesRef.current = [];
    playStartRef.current = (view.startedAt ?? Date.now()) + COUNTDOWN_MS;
    setSession(createSession(targetRef.current));
    setPhase('countdown');

    const supabase = getBrowserSupabase();
    if (supabase) {
      channelRef.current?.unsubscribe();
      const channel = supabase.channel(`match:${view.id}`);
      channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== view.me?.userId) {
          setOpponent({ typed: payload.typed as string, wpm: payload.wpm as number });
        }
      });
      channel.subscribe();
      channelRef.current = channel;
    }
  }, []);

  useEffect(() => () => void channelRef.current?.unsubscribe(), []);

  // Poll while searching (until active) and waiting (until finished).
  useEffect(() => {
    if (phase !== 'searching' && phase !== 'waiting') return;
    if (!match?.id) return;
    let cancelled = false;

    const tick = async () => {
      const view = await fetchMatch(match.id);
      if (cancelled || !view) return;
      setMatch(view);
      if (phaseRef.current === 'searching' && view.status === 'active' && view.startedAt) {
        beginCountdown(view);
      }
      if (view.status === 'finished') setPhase('finished');
      if (view.status === 'abandoned') setPhase('abandoned');
    };
    void tick();
    const interval = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [phase, match?.id, beginCountdown]);

  // Clock: countdown → play → submit at 0.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'playing') return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (phaseRef.current === 'countdown') {
        const left = playStartRef.current - now;
        setClock(Math.max(0, left));
        if (left <= 0) setPhase('playing');
        return;
      }
      const left = playStartRef.current + TYPING_DUEL_RULES.durationMs - now;
      setClock(Math.max(0, left));
      if (left <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        const matchId = match?.id;
        if (matchId) {
          void submitDuel(matchId, {
            durationMs: TYPING_DUEL_RULES.durationMs,
            keystrokes: keystrokesRef.current,
          });
        }
        setPhase('waiting');
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [phase, match?.id]);

  // Broadcast my typed text on a steady cadence while playing.
  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = window.setInterval(() => {
      const current = sessionRef.current;
      if (!current) return;
      // Session timestamps are relative to play start, so "now" must be too.
      const stats = sessionStats(current, Date.now() - playStartRef.current);
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: myUserId,
          typed: current.chars.map((c) => c.typed).join(''),
          wpm: Math.round(stats.netWpm),
        },
      });
    }, BROADCAST_MS);
    return () => window.clearInterval(interval);
  }, [phase, myUserId]);

  // Keystrokes: feed the engine AND the raw log the server will replay.
  useEffect(() => {
    if (phase !== 'playing') return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key !== 'Backspace' && event.key.length !== 1) return;
      event.preventDefault();
      const at = Date.now() - playStartRef.current;
      keystrokesRef.current.push({ key: event.key, at });
      setSession((current) => (current ? applyKey(current, event.key, at) : current));
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [phase]);

  // ── render ───────────────────────────────────────────────────────────────

  if (!signedIn) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <KeycapBuddy mood="focus" size={100} />
          <p className="text-muted-foreground">{dict.duel.signInFirst}</p>
          <Link href={`/${locale}/sign-in`}>
            <Button>{dict.auth.signIn}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'idle') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
          <KeycapBuddy mood="focus" size={110} className="animate-bob" />
          <h1 className="text-3xl font-extrabold">{dict.typingDuel.title}</h1>
          <p className="max-w-md text-muted-foreground">{dict.typingDuel.desc}</p>
          <Button size="lg" onClick={() => void search()} data-testid="find-typing-opponent">
            <Keyboard className="size-5" /> {dict.duel.findOpponent}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'searching') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
          <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
          <p className="font-semibold">{dict.duel.searching}</p>
          <Button variant="outline" onClick={() => void cancel()}>
            {dict.duel.cancelSearch}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'countdown') {
    return (
      <Card>
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            {dict.duel.opponent}: {match?.opponent?.displayName ?? '…'}
          </p>
          <p className="text-7xl font-extrabold tabular-nums text-primary">
            {Math.ceil(clock / 1000)}
          </p>
          <p className="text-muted-foreground">{dict.arena.getReady}</p>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'playing' || phase === 'waiting') {
    const myStats = session ? sessionStats(session, session.lastKeyAt ?? session.startedAt ?? 0) : null;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-lg font-bold tabular-nums">
          <span className="inline-flex items-center gap-2">
            <Timer className="size-5 text-accent" aria-hidden />
            {(clock / 1000).toFixed(1)}s
          </span>
          <span className="text-primary">
            {dict.duel.you}: {myStats ? Math.round(myStats.netWpm) : 0} {dict.typing.wpm}
          </span>
          <span className="text-accent">
            {match?.opponent?.displayName ?? dict.duel.opponent}: {opponent.wpm}{' '}
            {dict.typing.wpm}
          </span>
        </div>

        {phase === 'playing' && session ? (
          <>
            <TypingText session={session} locale="en" />
            <OpponentPane
              label={match?.opponent?.displayName ?? dict.duel.opponent}
              target={session.target}
              typed={opponent.typed}
            />
          </>
        ) : (
          <Card>
            <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              <p className="text-muted-foreground">{dict.duel.waitingOpponent}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (phase === 'finished' && match?.me) {
    const me = match.me;
    const opp = match.opponent;
    const won = me.placement === 1 && opp?.placement === 2;
    const draw = me.placement === 1 && opp?.placement === 1;
    const delta =
      me.ratingAfter !== null && me.ratingBefore !== null
        ? Math.round(me.ratingAfter - me.ratingBefore)
        : 0;
    const tier = me.ratingAfter !== null ? tierFor(me.ratingAfter) : 'bronze';

    return (
      <div className="flex flex-col gap-6 text-center" data-testid="typing-duel-results">
        <KeycapBuddy mood={won ? 'cheer' : 'focus'} size={120} className="mx-auto animate-pop" />
        <h1
          className={cn(
            'text-5xl font-extrabold',
            won ? 'text-success' : draw ? 'text-warning' : 'text-danger',
          )}
        >
          {won ? dict.duel.victory : draw ? dict.duel.draw : dict.duel.defeat}
        </h1>
        <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-4">
          <WpmResult label={dict.duel.you} centiWpm={me.score} accuracy={me.accuracy} highlight dict={dict} />
          <WpmResult
            label={opp?.displayName ?? dict.duel.opponent}
            centiWpm={opp?.score ?? 0}
            accuracy={opp?.accuracy ?? 0}
            dict={dict}
          />
        </div>
        <p className="text-lg font-semibold">
          {dict.duel.ratingLabel}:{' '}
          <span className="tabular-nums">{Math.round(me.ratingAfter ?? 1500)}</span>{' '}
          <span className={cn('tabular-nums', delta >= 0 ? 'text-success' : 'text-danger')}>
            ({delta >= 0 ? '+' : ''}
            {delta})
          </span>{' '}
          <Badge variant="accent" className="ms-2 align-middle">
            <Trophy className="size-3.5" /> {dict.tiers[tier]}
          </Badge>
        </p>
        <Button size="lg" className="mx-auto" onClick={() => void search()}>
          {dict.duel.playAgain}
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <KeycapBuddy mood="zen" size={100} />
        <p className="text-muted-foreground">{dict.duel.abandoned}</p>
        <Button onClick={() => void search()}>{dict.duel.playAgain}</Button>
      </CardContent>
    </Card>
  );
}

/**
 * The opponent's live pane — their actual keystrokes reconstructed against
 * the shared target: green where they typed right, red where they slipped.
 */
function OpponentPane({
  label,
  target,
  typed,
}: {
  label: string;
  target: string;
  typed: string;
}) {
  const WINDOW = 240;
  const position = typed.length;
  const start = Math.max(0, position - 100);
  const visible = target.slice(start, start + WINDOW);

  return (
    <div className="flex flex-col gap-1" data-testid="opponent-pane">
      <span className="text-xs font-semibold uppercase tracking-wide text-accent">{label}</span>
      <Card className="border-accent/40">
        <CardContent
          dir="ltr"
          className="select-none p-4 font-mono text-base leading-relaxed tracking-wide opacity-90"
        >
          {[...visible].map((char, i) => {
            const index = start + i;
            const theirChar = index < position ? typed[index] : null;
            const isCaret = index === position;
            return (
              <span
                key={index}
                className={cn(
                  theirChar === null && 'text-muted-foreground',
                  theirChar !== null && theirChar === target[index] && 'text-foreground',
                  theirChar !== null && theirChar !== target[index] && 'bg-danger/20 text-danger',
                  isCaret && 'animate-pulse rounded-sm bg-accent/40',
                )}
              >
                {char}
              </span>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function WpmResult({
  label,
  centiWpm,
  accuracy,
  highlight,
  dict,
}: {
  label: string;
  centiWpm: number;
  accuracy: number;
  highlight?: boolean;
  dict: { typing: { wpm: string } };
}) {
  return (
    <Card className={cn(highlight && 'border-primary')}>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="truncate text-sm font-semibold">{label}</span>
        <span className="text-3xl font-extrabold tabular-nums">
          {Math.round(centiWpm / 100)} <span className="text-base">{dict.typing.wpm}</span>
        </span>
        <span className="text-xs text-muted-foreground">{Math.round(accuracy * 100)}%</span>
      </CardContent>
    </Card>
  );
}
