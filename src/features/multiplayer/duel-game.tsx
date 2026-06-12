'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Loader2, Swords, Timer, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KeycapBuddy } from '@/components/shared/keycap-buddy';
import { registry } from '@/content';
import { DUEL_RULES, createRng, duelPool, pickPrompt, type Rng } from '@/core/arena';
import type { ShortcutDefinition } from '@/core/content';
import { tierFor } from '@/core/rating';
import { pointsForAnswer, type DrillEvent } from '@/core/scoring';
import { useOptionalAuth } from '@/features/auth/provider';
import { useKeyCapture } from '@/features/practice/use-key-capture';
import { WinKeyHint } from '@/features/practice/win-key-mode';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import type { Dictionary } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { fetchMatch, joinQueue, leaveQueue, submitDuel } from './match-client';
import type { MatchView } from './schemas';

type Phase = 'idle' | 'searching' | 'countdown' | 'playing' | 'waiting' | 'finished' | 'abandoned';

const COUNTDOWN_MS = 3_000;
const POLL_MS = 2_000;

/**
 * Ranked 1v1 duel. Both players generate the identical seeded prompt
 * sequence locally; live scores cross over a Realtime broadcast channel;
 * the server is the only judge (re-score + seed verification + Glicko-2).
 */
export function DuelGame() {
  const { locale, dict } = useI18n();
  const auth = useOptionalAuth();
  const signedIn = Boolean(auth?.session);
  const myUserId = auth?.session?.user.id ?? '';

  const [phase, setPhase] = useState<Phase>('idle');
  const [match, setMatch] = useState<MatchView | null>(null);
  const [clock, setClock] = useState(0); // ms left in current phase
  const [prompt, setPrompt] = useState<ShortcutDefinition | null>(null);
  const [liveScore, setLiveScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [opponentLive, setOpponentLive] = useState(0);

  const rngRef = useRef<Rng | null>(null);
  const poolRef = useRef<ShortcutDefinition[]>([]);
  const eventsRef = useRef<DrillEvent[]>([]);
  const comboRef = useRef(0);
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
    setOpponentLive(0);
    setLiveScore(0);
    setCombo(0);
    submittedRef.current = false;
    eventsRef.current = [];
    const joined = await joinQueue();
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
    poolRef.current = duelPool(registry.getDomain('win11')?.shortcuts ?? []);
    rngRef.current = createRng(view.seed);
    eventsRef.current = [];
    comboRef.current = 0;
    playStartRef.current = (view.startedAt ?? Date.now()) + COUNTDOWN_MS;
    setPrompt(null);
    setPhase('countdown');

    // Realtime: live opponent score, both directions.
    const supabase = getBrowserSupabase();
    if (supabase) {
      channelRef.current?.unsubscribe();
      const channel = supabase.channel(`match:${view.id}`);
      channel.on('broadcast', { event: 'progress' }, ({ payload }) => {
        if (payload.userId !== view.me?.userId) {
          setOpponentLive(payload.score as number);
        }
      });
      channel.subscribe();
      channelRef.current = channel;
    }
  }, []);

  useEffect(() => () => void channelRef.current?.unsubscribe(), []);

  // Poll the match while searching (until active) and waiting (until finished).
  useEffect(() => {
    if (phase !== 'searching' && phase !== 'waiting') return;
    if (!match?.id) return;
    let cancelled = false;

    const tick = async () => {
      const view = await fetchMatch(match.id);
      if (cancelled || !view) return;
      setMatch(view);
      if (view.opponent) setOpponentLive((s) => Math.max(s, view.opponent?.score ?? 0));
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

  // Shared clock for countdown + play; drives phase transitions.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'playing') return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (phaseRef.current === 'countdown') {
        const left = playStartRef.current - now;
        setClock(Math.max(0, left));
        if (left <= 0) {
          setPrompt(pickPrompt(poolRef.current, rngRef.current!, null));
          setPhase('playing');
        }
        return;
      }
      const left = playStartRef.current + DUEL_RULES.durationMs - now;
      setClock(Math.max(0, left));
      if (left <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        const matchId = match?.id;
        if (matchId) {
          void submitDuel(matchId, {
            durationMs: DUEL_RULES.durationMs,
            events: eventsRef.current,
          });
        }
        setPhase('waiting');
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [phase, match?.id]);

  // ── input ────────────────────────────────────────────────────────────────

  const handleAnswer = useCallback(
    ({ correct, reactionMs }: { correct: boolean; reactionMs: number }) => {
      if (phaseRef.current !== 'playing' || !prompt || !rngRef.current) return;
      const answeredAt = performance.now();
      const playStartPerf = answeredAt - (Date.now() - playStartRef.current);
      const relAnswered = answeredAt - playStartPerf;
      eventsRef.current.push({
        shortcutId: prompt.id,
        promptAt: Math.max(0, relAnswered - reactionMs),
        answeredAt: relAnswered,
        correct,
      });

      let nextScore = liveScore;
      if (correct) {
        comboRef.current += 1;
        nextScore = liveScore + pointsForAnswer(reactionMs, comboRef.current);
        setLiveScore(nextScore);
      } else {
        comboRef.current = 0;
      }
      setCombo(comboRef.current);
      setPrompt(pickPrompt(poolRef.current, rngRef.current, prompt.id));

      void channelRef.current?.send({
        type: 'broadcast',
        event: 'progress',
        payload: { userId: myUserId, score: nextScore },
      });
    },
    [prompt, liveScore, myUserId],
  );

  useKeyCapture({
    keys: prompt?.keys ?? [],
    enabled: phase === 'playing' && prompt !== null,
    onResult: handleAnswer,
  });

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
          <h1 className="text-3xl font-extrabold">{dict.duel.title}</h1>
          <p className="max-w-md text-muted-foreground">{dict.duel.desc}</p>
          <Button size="lg" onClick={() => void search()} data-testid="find-opponent">
            <Swords className="size-5" /> {dict.duel.findOpponent}
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
    return (
      <div className="flex flex-col gap-4">
        <ScoreBars
          dict={dict}
          you={liveScore}
          opponent={opponentLive}
          opponentName={match?.opponent?.displayName ?? dict.duel.opponent}
        />
        <div className="flex items-center justify-between text-lg font-bold tabular-nums">
          <span className="inline-flex items-center gap-2">
            <Timer className="size-5 text-accent" aria-hidden />
            {(clock / 1000).toFixed(1)}s
          </span>
          <span>×{combo}</span>
        </div>
        {phase === 'playing' && prompt ? (
          <Card>
            <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center">
              <h2 className="text-3xl font-extrabold">{prompt.name[locale]}</h2>
              <p className="text-muted-foreground">{prompt.description[locale]}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              <p className="text-muted-foreground">{dict.duel.waitingOpponent}</p>
            </CardContent>
          </Card>
        )}
        {phase === 'playing' && <WinKeyHint />}
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
      <div className="flex flex-col gap-6 text-center">
        <KeycapBuddy mood={won ? 'cheer' : 'focus'} size={120} className="mx-auto animate-pop" />
        <h1
          className={cn(
            'text-5xl font-extrabold',
            won ? 'text-success' : draw ? 'text-warning' : 'text-danger',
          )}
          data-testid="duel-outcome"
        >
          {won ? dict.duel.victory : draw ? dict.duel.draw : dict.duel.defeat}
        </h1>
        <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-4">
          <PlayerResult label={dict.duel.you} score={me.score} accuracy={me.accuracy} highlight />
          <PlayerResult
            label={opp?.displayName ?? dict.duel.opponent}
            score={opp?.score ?? 0}
            accuracy={opp?.accuracy ?? 0}
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

  // abandoned
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

function ScoreBars({
  dict,
  you,
  opponent,
  opponentName,
}: {
  dict: Dictionary;
  you: number;
  opponent: number;
  opponentName: string;
}) {
  const max = Math.max(you, opponent, 1);
  return (
    <div className="flex flex-col gap-2" data-testid="duel-bars">
      <Bar label={dict.duel.you} value={you} fraction={you / max} className="bg-primary" />
      <Bar label={opponentName} value={opponent} fraction={opponent / max} className="bg-accent" />
    </div>
  );
}

function Bar({
  label,
  value,
  fraction,
  className,
}: {
  label: string;
  value: number;
  fraction: number;
  className: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 truncate text-sm font-semibold">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-300', className)}
          style={{ width: `${Math.round(fraction * 100)}%` }}
        />
      </div>
      <span className="w-16 text-end text-sm font-bold tabular-nums">{value.toLocaleString()}</span>
    </div>
  );
}

function PlayerResult({
  label,
  score,
  accuracy,
  highlight,
}: {
  label: string;
  score: number;
  accuracy: number;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && 'border-primary')}>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="truncate text-sm font-semibold">{label}</span>
        <span className="text-3xl font-extrabold tabular-nums">{score.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">{Math.round(accuracy * 100)}%</span>
      </CardContent>
    </Card>
  );
}
