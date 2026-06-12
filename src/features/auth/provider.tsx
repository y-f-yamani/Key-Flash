'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase/client';

interface AuthContextValue {
  /** Null when signed out OR when Supabase isn't configured. */
  session: Session | null;
  /** False until the initial session check resolves. */
  ready: boolean;
  /** Whether cloud features (sync, leaderboards) are available at all. */
  cloudEnabled: boolean;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // NEXT_PUBLIC_ env vars are inlined at build time, so this is identical on
  // server and client — no hydration mismatch, no effect needed.
  const [cloudEnabled] = useState(() => Boolean(getBrowserSupabase()));
  // Local-first mode has no session to wait for: ready immediately.
  const [ready, setReady] = useState(() => !cloudEnabled);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      cloudEnabled,
      signOut: async () => {
        await getBrowserSupabase()?.auth.signOut();
      },
    }),
    [session, ready, cloudEnabled],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** Null outside an <AuthProvider> — for consumers that must work standalone. */
export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
