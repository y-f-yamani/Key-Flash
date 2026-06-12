'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/provider';

/**
 * Real-key capture via the Keyboard Lock API (Chromium/Edge, fullscreen
 * only) — the upgrade path promised in ADR-0004. We lock ALL keys, not just
 * Meta: Alt+Tab and Win+Tab are OS-owned too and only arrive under a full
 * lock. While locked, the OS stays quiet and genuine Windows shortcuts reach
 * the page. The Ctrl+Alt stand-in keeps working in parallel.
 *
 * Lock state lives in a module-level store so every component (hints,
 * mission runner) sees the same value via useSyncExternalStore.
 */

interface KeyboardLock {
  lock(keyCodes?: string[]): Promise<void>;
  unlock(): void;
}

function keyboardLockApi(): KeyboardLock | null {
  if (typeof navigator === 'undefined') return null;
  const keyboard = (navigator as Navigator & { keyboard?: Partial<KeyboardLock> }).keyboard;
  return keyboard?.lock && keyboard.unlock ? (keyboard as KeyboardLock) : null;
}

let lockActive = false;
const listeners = new Set<() => void>();

function setLockActive(next: boolean): void {
  if (lockActive === next) return;
  lockActive = next;
  for (const notify of listeners) notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWinKeyMode(): {
  supported: boolean;
  active: boolean;
  enable(): Promise<void>;
  disable(): void;
} {
  const supported = useSyncExternalStore(
    subscribe,
    () => keyboardLockApi() !== null,
    () => false,
  );
  const active = useSyncExternalStore(
    subscribe,
    () => lockActive,
    () => false,
  );

  const enable = useCallback(async () => {
    const api = keyboardLockApi();
    if (!api) return;
    try {
      await document.documentElement.requestFullscreen();
      // No key list = lock everything available (incl. Alt+Tab, Win+Tab).
      await api.lock();
      setLockActive(true);
    } catch {
      // User denied fullscreen or lock failed — stand-in keys still work.
    }
  }, []);

  const disable = useCallback(() => {
    keyboardLockApi()?.unlock();
    if (document.fullscreenElement) void document.exitFullscreen();
    setLockActive(false);
  }, []);

  // Leaving fullscreen (hold Esc, F11, task switch) always ends the mode.
  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) {
        keyboardLockApi()?.unlock();
        setLockActive(false);
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  return { supported, active, enable, disable };
}

/**
 * The hint + toggle rendered wherever Win-key shortcuts are drilled.
 * Unsupported browsers just see the stand-in note.
 */
export function WinKeyHint({ show = true }: { show?: boolean }) {
  const { dict } = useI18n();
  const { supported, active, enable, disable } = useWinKeyMode();

  if (!show) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
      {active ? (
        <>
          <Badge variant="success">{dict.practice.winKeyActive}</Badge>
          <Button variant="ghost" size="sm" onClick={disable}>
            <Minimize2 className="size-3.5" /> {dict.practice.winKeyExit}
          </Button>
        </>
      ) : (
        <>
          <span>{dict.practice.metaRemapNote}</span>
          {supported && (
            <Button variant="outline" size="sm" onClick={() => void enable()} data-testid="win-key-toggle">
              <Maximize2 className="size-3.5" /> {dict.practice.winKeyEnable}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
