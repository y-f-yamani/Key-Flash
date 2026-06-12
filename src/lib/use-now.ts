'use client';

import { useSyncExternalStore } from 'react';

/**
 * Render-pure clock: a shared external store that ticks every 30s. Components
 * that need "now" (due reviews, streak liveness) read it without calling
 * Date.now() during render, and re-render automatically as time passes.
 */
const listeners = new Set<() => void>();
let currentNow = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const TICK_MS = 30_000;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    timer = setInterval(() => {
      currentNow = Date.now();
      for (const notify of listeners) notify();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => currentNow,
    () => currentNow,
  );
}
