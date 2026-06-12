import type { KeyChord, Modifier } from './types';

const MODIFIER_LABELS: Record<Modifier, string> = {
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  meta: 'Win',
};

const CODE_LABELS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
  PrintScreen: 'PrtScn',
  Period: '.',
  Comma: ',',
  Slash: '/',
  Semicolon: ';',
  Minus: '-',
  Equal: '+',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  Backspace: '⌫',
  Space: 'Space',
};

/** Display label for a single key code, e.g. "KeyE" → "E", "ArrowUp" → "↑". */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return CODE_LABELS[code] ?? code;
}

/** Windows display convention: Win first, then Ctrl, Alt, Shift. */
const DISPLAY_ORDER: Modifier[] = ['meta', 'ctrl', 'alt', 'shift'];

/** Ordered labels for a chord, e.g. ["Win", "Shift", "S"]. */
export function chordLabels(chord: KeyChord): string[] {
  const modifiers = [...chord.modifiers].sort(
    (a, b) => DISPLAY_ORDER.indexOf(a) - DISPLAY_ORDER.indexOf(b),
  );
  return [...modifiers.map((m) => MODIFIER_LABELS[m]), keyLabel(chord.code)];
}

/** "Win + Shift + S" — for plain-text contexts (aria labels, logs). */
export function formatChord(chord: KeyChord): string {
  return chordLabels(chord).join(' + ');
}

/** "Win + X, then U" for sequences; localized rendering is done in the UI. */
export function formatSequence(chords: readonly KeyChord[]): string {
  return chords.map(formatChord).join(', ');
}
