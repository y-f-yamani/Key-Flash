import { MODIFIERS, type KeyChord, type KeyEventLike, type Modifier } from './types';

/** Codes that are modifiers themselves and therefore never complete a chord. */
const MODIFIER_CODES = new Set([
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'ShiftLeft',
  'ShiftRight',
  'MetaLeft',
  'MetaRight',
]);

export function isModifierCode(code: string): boolean {
  return MODIFIER_CODES.has(code);
}

/** Human-friendly names accepted by `parseChord`, mapped to event codes. */
const NAMED_CODES: Record<string, string> = {
  tab: 'Tab',
  enter: 'Enter',
  esc: 'Escape',
  escape: 'Escape',
  space: 'Space',
  backspace: 'Backspace',
  delete: 'Delete',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  printscreen: 'PrintScreen',
  comma: 'Comma',
  period: 'Period',
  slash: 'Slash',
  semicolon: 'Semicolon',
  minus: 'Minus',
  equal: 'Equal',
  plus: 'Equal', // physical key that carries "+" on standard layouts
};

const MODIFIER_ALIASES: Record<string, Modifier> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  shift: 'shift',
  win: 'meta',
  meta: 'meta',
  cmd: 'meta',
};

/**
 * Parses a human-readable chord like "Win+Shift+S" or "Ctrl+." into a KeyChord.
 * Used by content catalogs so shortcut data stays readable; validated by tests.
 * Throws on malformed input — catalog errors must fail loudly at build/test time.
 */
export function parseChord(text: string): KeyChord {
  const parts = text.split('+').map((p) => p.trim());
  if (parts.some((p) => p === '')) {
    throw new Error(`Malformed chord "${text}"`);
  }
  const modifiers: Modifier[] = [];
  const mainParts: string[] = [];

  for (const part of parts) {
    const modifier = MODIFIER_ALIASES[part.toLowerCase()];
    if (modifier) {
      if (modifiers.includes(modifier)) throw new Error(`Duplicate modifier in "${text}"`);
      modifiers.push(modifier);
    } else {
      mainParts.push(part);
    }
  }

  if (mainParts.length !== 1) {
    throw new Error(`Chord "${text}" must have exactly one non-modifier key`);
  }

  return { modifiers: sortModifiers(modifiers), code: toCode(mainParts[0]) };
}

/** Parses a sequence like ["Win+X", "U"] — most shortcuts are a single chord. */
export function parseSequence(...chords: string[]): KeyChord[] {
  return chords.map(parseChord);
}

function toCode(name: string): string {
  if (/^[a-zA-Z]$/.test(name)) return `Key${name.toUpperCase()}`;
  if (/^[0-9]$/.test(name)) return `Digit${name}`;
  if (/^F([1-9]|1[0-9]|2[0-4])$/i.test(name)) return name.toUpperCase();
  if (name === '.') return 'Period';
  if (name === ',') return 'Comma';
  if (name === '/') return 'Slash';
  if (name === ';') return 'Semicolon';
  const named = NAMED_CODES[name.toLowerCase()];
  if (named) return named;
  throw new Error(`Unknown key name "${name}"`);
}

/** Canonical modifier order so chords compare structurally. */
export function sortModifiers(modifiers: readonly Modifier[]): Modifier[] {
  return [...modifiers].sort((a, b) => MODIFIERS.indexOf(a) - MODIFIERS.indexOf(b));
}

/**
 * Converts a keyboard event into the chord it completes, or null when the
 * event cannot complete a chord (modifier-only press or auto-repeat).
 */
export function chordFromEvent(event: KeyEventLike): KeyChord | null {
  if (event.repeat || isModifierCode(event.code)) return null;
  const modifiers: Modifier[] = [];
  if (event.ctrlKey) modifiers.push('ctrl');
  if (event.altKey) modifiers.push('alt');
  if (event.shiftKey) modifiers.push('shift');
  if (event.metaKey) modifiers.push('meta');
  return { modifiers, code: event.code };
}

export function chordsEqual(a: KeyChord, b: KeyChord): boolean {
  if (a.code !== b.code || a.modifiers.length !== b.modifiers.length) return false;
  const bSet = new Set(b.modifiers);
  return a.modifiers.every((m) => bSet.has(m));
}
