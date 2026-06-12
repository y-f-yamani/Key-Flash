'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { dateKeyInTimeZone } from '@/core/gamification';
import type { SprintResult } from '@/core/scoring';
import type { Difficulty } from '@/core/content';
import { useOptionalAuth } from '@/features/auth/provider';
import { getBrowserSupabase } from '@/lib/supabase/client';
import {
  LocalProgressRepository,
  MirroredProgressRepository,
  type ProgressRepository,
} from './repository';
import { applyDrill, applyLessonComplete, applySprintResult } from './state';
import { SupabaseProgressRepository } from './supabase-repository';
import { INITIAL_PLAYER_STATE, type DrillOutcome, type PlayerState } from './types';

interface ProgressContextValue {
  /** False until the repository has loaded — render placeholders meanwhile. */
  ready: boolean;
  state: PlayerState;
  recordDrill(drill: DrillOutcome, difficulty: Difficulty): void;
  completeLesson(): void;
  completeSprint(mode: string, result: SprintResult): { isRecord: boolean; xpEarned: number };
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

function todayKey(): string {
  return dateKeyInTimeZone(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone);
}

export function ProgressProvider({
  children,
  repository,
}: {
  children: ReactNode;
  /** Injectable for tests; defaults to localStorage persistence (ADR-0005). */
  repository?: ProgressRepository;
}) {
  const repoRef = useRef<ProgressRepository | null>(repository ?? null);
  const [state, setState] = useState<PlayerState>(INITIAL_PLAYER_STATE);

  // Optional so tests and storybook-style usage can run without auth.
  const auth = useOptionalAuth();
  const userId = auth?.session?.user.id ?? null;
  const authReady = repository ? true : (auth?.ready ?? true);

  // Which repository the current `state` was loaded from. Signing in/out
  // changes the key, which reads as "not ready" until the new load lands —
  // no synchronous setState needed when the repository switches.
  const repoKey = repository ? 'injected' : (userId ?? 'local');
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const ready = loadedFor === repoKey;

  useEffect(() => {
    if (!authReady) return;

    // Repositories are created in the browser (localStorage, supabase auth
    // cookies); an explicitly injected one (tests) is used as-is.
    if (!repository) {
      const local = new LocalProgressRepository();
      const supabase = userId ? getBrowserSupabase() : null;
      repoRef.current =
        supabase && userId
          ? new MirroredProgressRepository(local, new SupabaseProgressRepository(supabase, userId))
          : local;
    }

    let cancelled = false;
    repoRef.current?.load().then((loaded) => {
      if (cancelled) return;
      setState(loaded);
      setLoadedFor(repoKey);
    });
    return () => {
      cancelled = true;
    };
  }, [repository, userId, authReady, repoKey]);

  const persist = useCallback((next: PlayerState) => {
    setState(next);
    void repoRef.current?.save(next);
  }, []);

  const recordDrill = useCallback(
    (drill: DrillOutcome, difficulty: Difficulty) => {
      setState((current) => {
        const next = applyDrill(current, drill, difficulty, Date.now(), todayKey());
        void repoRef.current?.save(next);
        return next;
      });
    },
    [],
  );

  const completeLesson = useCallback(() => {
    setState((current) => {
      const next = applyLessonComplete(current, todayKey());
      void repoRef.current?.save(next);
      return next;
    });
  }, []);

  const completeSprint = useCallback(
    (mode: string, result: SprintResult) => {
      const outcome = applySprintResult(state, mode, result, Date.now(), todayKey());
      persist(outcome.state);
      return { isRecord: outcome.isRecord, xpEarned: outcome.xpEarned };
    },
    [state, persist],
  );

  const value = useMemo(
    () => ({ ready, state, recordDrill, completeLesson, completeSprint }),
    [ready, state, recordDrill, completeLesson, completeSprint],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress must be used inside <ProgressProvider>');
  return value;
}
