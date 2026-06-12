/**
 * Keyboard domain model.
 *
 * Chords are stored against physical key positions (W3C `KeyboardEvent.code`,
 * e.g. "KeyE", "Digit1", "ArrowUp") rather than layout-dependent `event.key`
 * values — see ADR-0003. Display labels are derived separately.
 */

export const MODIFIERS = ['ctrl', 'alt', 'shift', 'meta'] as const;

export type Modifier = (typeof MODIFIERS)[number];

/** One simultaneous key press: zero or more modifiers plus a single main key. */
export interface KeyChord {
  readonly modifiers: readonly Modifier[];
  /** W3C KeyboardEvent.code of the non-modifier key, e.g. "KeyE". */
  readonly code: string;
}

/**
 * A minimal, environment-free view of a keyboard event. The browser adapter
 * maps a real KeyboardEvent into this; tests construct it directly.
 */
export interface KeyEventLike {
  readonly code: string;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
}

/** Result of feeding one event into a matcher. */
export type MatchOutcome =
  | { kind: 'ignored' } // modifier-only press, key repeat, etc.
  | { kind: 'progress'; stepIndex: number } // sequence advanced, more steps remain
  | { kind: 'matched' }
  | { kind: 'failed'; pressed: KeyChord };

/**
 * How well a shortcut can be physically captured inside a browser tab.
 * - full:    browser receives the event and can suppress default behavior.
 * - partial: browser sees the event but the OS/browser may also act on it.
 * - none:    the OS consumes it before the page ever sees it (e.g. Win+L).
 * See ADR-0004.
 */
export type Capturability = 'full' | 'partial' | 'none';
