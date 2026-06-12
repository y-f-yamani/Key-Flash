/**
 * Touch-typing engine (Monkeytype-style). Pure data + transitions:
 * `(session, key, timestamp) → session` — no DOM, no timers, fully testable.
 *
 * Model: a target text is typed character by character. Wrong characters are
 * recorded in place (the caret advances) and can be corrected with Backspace.
 * Accuracy counts every keystroke ever made — corrections don't erase errors.
 */

export interface TypedChar {
  readonly expected: string;
  readonly typed: string;
  readonly correct: boolean;
}

export interface TypingSession {
  readonly target: string;
  /** Caret index — equals the number of chars currently in place. */
  readonly position: number;
  /** Chars currently in place (length === position; Backspace pops). */
  readonly chars: readonly TypedChar[];
  /** Total character keystrokes ever (Backspace excluded). */
  readonly keystrokes: number;
  /** Keystrokes that were correct when made. */
  readonly correctKeystrokes: number;
  /** Longest run of consecutive correct keystrokes. */
  readonly bestStreak: number;
  readonly currentStreak: number;
  /** Timestamp of the first keystroke, or null before typing starts. */
  readonly startedAt: number | null;
  /** Timestamp of the latest keystroke. */
  readonly lastKeyAt: number | null;
  /** Gaps between consecutive keystrokes (ms) — feeds consistency. */
  readonly gaps: readonly number[];
}

export function createSession(target: string): TypingSession {
  return {
    target,
    position: 0,
    chars: [],
    keystrokes: 0,
    correctKeystrokes: 0,
    bestStreak: 0,
    currentStreak: 0,
    startedAt: null,
    lastKeyAt: null,
    gaps: [],
  };
}

/** Appends more text (endless timed modes top up the target as the user nears the end). */
export function extendTarget(session: TypingSession, extra: string): TypingSession {
  return { ...session, target: session.target + extra };
}

/**
 * Applies one keystroke. `key` is a single printable character or 'Backspace';
 * anything else is ignored (callers filter modifiers/arrows).
 */
export function applyKey(session: TypingSession, key: string, at: number): TypingSession {
  if (key === 'Backspace') {
    if (session.position === 0) return session;
    return {
      ...session,
      position: session.position - 1,
      chars: session.chars.slice(0, -1),
    };
  }

  if (key.length !== 1 || session.position >= session.target.length) return session;

  const expected = session.target[session.position];
  const correct = key === expected;
  const currentStreak = correct ? session.currentStreak + 1 : 0;

  return {
    ...session,
    position: session.position + 1,
    chars: [...session.chars, { expected, typed: key, correct }],
    keystrokes: session.keystrokes + 1,
    correctKeystrokes: session.correctKeystrokes + (correct ? 1 : 0),
    bestStreak: Math.max(session.bestStreak, currentStreak),
    currentStreak,
    startedAt: session.startedAt ?? at,
    lastKeyAt: at,
    gaps: session.lastKeyAt === null ? session.gaps : [...session.gaps, at - session.lastKeyAt],
  };
}

export interface TypingStats {
  /** Net WPM — correct chars in place, standard 5-char word. */
  readonly netWpm: number;
  /** Gross WPM — all keystrokes, the "raw" speed. */
  readonly grossWpm: number;
  /** Correct keystrokes over all keystrokes (corrections don't erase errors). */
  readonly accuracy: number;
  /** Pace steadiness in 0..1 from inter-keystroke gap variation. */
  readonly consistency: number;
  readonly elapsedMs: number;
  readonly avgGapMs: number;
}

export function sessionStats(session: TypingSession, now: number): TypingStats {
  const elapsedMs = session.startedAt === null ? 0 : Math.max(1, now - session.startedAt);
  const minutes = elapsedMs / 60_000;
  const correctInPlace = session.chars.filter((c) => c.correct).length;

  const netWpm = minutes > 0 ? correctInPlace / 5 / minutes : 0;
  const grossWpm = minutes > 0 ? session.keystrokes / 5 / minutes : 0;
  const accuracy = session.keystrokes === 0 ? 0 : session.correctKeystrokes / session.keystrokes;

  return {
    netWpm,
    grossWpm,
    accuracy,
    consistency: gapConsistency(session.gaps),
    elapsedMs,
    avgGapMs: session.gaps.length === 0 ? 0 : Math.round(average(session.gaps)),
  };
}

/** 1 = metronome-steady typing; falls toward 0 as rhythm gets erratic. */
function gapConsistency(gaps: readonly number[]): number {
  if (gaps.length < 2) return gaps.length === 1 ? 1 : 0;
  const mean = average(gaps);
  if (mean === 0) return 0;
  const variance = gaps.reduce((sum, g) => sum + (g - mean) ** 2, 0) / gaps.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(1, 1 - cv));
}

function average(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
