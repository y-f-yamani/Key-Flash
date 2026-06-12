'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ShortcutMatcher,
  chordsEqual,
  type KeyChord,
  type Modifier,
} from '@/core/keyboard';

/** Default stand-in for the browser-reserved Win key during drills (ADR-0004). */
export const DEFAULT_META_REMAP: readonly Modifier[] = ['ctrl', 'alt'];

export interface CaptureResult {
  correct: boolean;
  /** performance.now()-based, sub-millisecond reaction time. */
  reactionMs: number;
  pressed: KeyChord | null;
}

interface UseKeyCaptureArgs {
  /** The expected chord sequence. */
  keys: readonly KeyChord[];
  /** Capture only runs while true; the arming instant starts the reaction clock. */
  enabled: boolean;
  onResult: (result: CaptureResult) => void;
}

/**
 * Listens to real keyboard events, matches them against the expected
 * shortcut, and reports correctness plus reaction time.
 *
 * Notes:
 * - Listens in the capture phase on `window` and calls `preventDefault` so
 *   page-level browser shortcuts (Ctrl+S, Ctrl+F, ...) don't fire mid-drill.
 * - `keys` containing `meta` are matched via the practice remap because
 *   browsers cannot reliably intercept the Win key (ADR-0004).
 */
export function useKeyCapture({ keys, enabled, onResult }: UseKeyCaptureArgs): {
  /** Chords completed so far for multi-step sequences. */
  stepIndex: number;
  needsMetaRemap: boolean;
} {
  // Progress is stored together with the keys it belongs to, so a new
  // expected shortcut implicitly reads as step 0 — no reset effect needed.
  const [progress, setProgress] = useState<{ keys: readonly KeyChord[]; step: number }>({
    keys,
    step: 0,
  });
  const stepIndex = progress.keys === keys ? progress.step : 0;

  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  const needsMetaRemap = keys.some((chord) => chord.modifiers.includes('meta'));

  useEffect(() => {
    if (!enabled || keys.length === 0) return;

    const matcher = new ShortcutMatcher(keys, { metaRemap: DEFAULT_META_REMAP });
    const armedAt = performance.now();

    function handleKeyDown(event: KeyboardEvent) {
      const outcome = matcher.handleEvent(event);
      if (outcome.kind === 'ignored') return;

      event.preventDefault();
      event.stopPropagation();

      if (outcome.kind === 'progress') {
        setProgress({ keys, step: outcome.stepIndex });
        return;
      }

      const reactionMs = performance.now() - armedAt;
      if (outcome.kind === 'matched') {
        onResultRef.current({ correct: true, reactionMs, pressed: keys[keys.length - 1] });
      } else {
        setProgress({ keys, step: 0 });
        onResultRef.current({ correct: false, reactionMs, pressed: outcome.pressed });
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [keys, enabled]);

  return { stepIndex, needsMetaRemap };
}

/** True when two sequences are identical — used by quiz options de-duplication. */
export function sequencesEqual(a: readonly KeyChord[], b: readonly KeyChord[]): boolean {
  return a.length === b.length && a.every((chord, i) => chordsEqual(chord, b[i]));
}
