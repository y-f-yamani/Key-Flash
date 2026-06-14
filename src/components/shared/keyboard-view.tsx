import type { KeyChord, Modifier } from '@/core/keyboard';
import { keyLabel } from '@/core/keyboard';
import { cn } from '@/lib/utils';

/**
 * A compact visual keyboard that highlights the keys a shortcut uses. Far
 * clearer than bare keycaps for *learning* — you see where the keys live and
 * which fingers reach them.
 */

interface Key {
  code: string;
  /** Flex weight (width); 1 by default. */
  w?: number;
}

const ROWS: Key[][] = [
  [
    { code: 'Escape', w: 1.4 },
    ...range('F', 1, 12),
    { code: 'PrintScreen', w: 1.4 },
  ],
  [
    ...digits(),
    { code: 'Minus' },
    { code: 'Equal' },
    { code: 'Backspace', w: 2 },
  ],
  [
    { code: 'Tab', w: 1.5 },
    ...letters('QWERTYUIOP'),
    { code: 'Delete', w: 1.5 },
  ],
  [
    { code: 'CapsLock', w: 1.8 },
    ...letters('ASDFGHJKL'),
    { code: 'Semicolon' },
    { code: 'Enter', w: 1.9 },
  ],
  [
    { code: 'ShiftLeft', w: 2.3 },
    ...letters('ZXCVBNM'),
    { code: 'Comma' },
    { code: 'Period' },
    { code: 'Slash' },
    { code: 'ShiftRight', w: 2.3 },
  ],
  [
    { code: 'ControlLeft', w: 1.6 },
    { code: 'MetaLeft', w: 1.3 },
    { code: 'AltLeft', w: 1.3 },
    { code: 'Space', w: 6 },
    { code: 'AltRight', w: 1.3 },
    { code: 'MetaRight', w: 1.3 },
    { code: 'ControlRight', w: 1.6 },
  ],
];

/** Navigation + arrow cluster shown beneath the main block. */
const NAV_ROW: Key[] = [
  { code: 'Home' },
  { code: 'End' },
  { code: 'PageUp' },
  { code: 'PageDown' },
  { code: 'ArrowLeft' },
  { code: 'ArrowUp' },
  { code: 'ArrowDown' },
  { code: 'ArrowRight' },
];

const LABELS: Record<string, string> = {
  Escape: 'Esc',
  PrintScreen: 'PrtSc',
  Backspace: '⌫',
  Tab: 'Tab',
  CapsLock: 'Caps',
  Enter: 'Enter',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  AltLeft: 'Alt',
  AltRight: 'Alt',
  MetaLeft: '⊞',
  MetaRight: '⊞',
  Space: 'Space',
  Delete: 'Del',
  Home: 'Home',
  End: 'End',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
};

const MODIFIER_CODES: Record<Modifier, string[]> = {
  ctrl: ['ControlLeft', 'ControlRight'],
  alt: ['AltLeft', 'AltRight'],
  shift: ['ShiftLeft', 'ShiftRight'],
  meta: ['MetaLeft', 'MetaRight'],
};

/** All key codes a chord sequence lights up (modifiers + main keys). */
function highlightedCodes(keys: readonly KeyChord[]): Set<string> {
  const set = new Set<string>();
  for (const chord of keys) {
    for (const modifier of chord.modifiers) {
      for (const code of MODIFIER_CODES[modifier]) set.add(code);
    }
    set.add(chord.code);
  }
  return set;
}

/** Just the non-modifier main keys — rendered with extra emphasis. */
function mainCodes(keys: readonly KeyChord[]): Set<string> {
  return new Set(keys.map((chord) => chord.code));
}

export function KeyboardView({ keys, className }: { keys: readonly KeyChord[]; className?: string }) {
  const lit = highlightedCodes(keys);
  const main = mainCodes(keys);

  return (
    <div
      dir="ltr"
      data-testid="keyboard-view"
      className={cn(
        'mx-auto flex w-full max-w-xl select-none flex-col gap-1 rounded-xl p-1.5 shadow-2xl ring-1 ring-black/50 sm:p-2',
        'bg-gradient-to-b from-neutral-800 to-neutral-950',
        className,
      )}
    >
      {ROWS.map((row, i) => (
        <div key={i} className="flex gap-1">
          {row.map((key) => (
            <KeyCell key={key.code} keyDef={key} lit={lit.has(key.code)} main={main.has(key.code)} />
          ))}
        </div>
      ))}
      <div className="flex justify-center gap-1">
        {NAV_ROW.map((key) => (
          <KeyCell key={key.code} keyDef={key} lit={lit.has(key.code)} main={main.has(key.code)} small />
        ))}
      </div>
    </div>
  );
}

function KeyCell({
  keyDef,
  lit,
  main,
  small,
}: {
  keyDef: Key;
  lit: boolean;
  main: boolean;
  small?: boolean;
}) {
  const label = LABELS[keyDef.code] ?? keyLabel(keyDef.code);
  return (
    <span
      style={{ flexGrow: keyDef.w ?? 1, flexBasis: 0 }}
      data-lit={lit ? (main ? 'main' : 'mod') : undefined}
      className={cn(
        'flex items-center justify-center rounded-md border-b-2 text-center font-medium leading-none transition-all duration-200',
        small ? 'h-4 text-[0.45rem] sm:h-5 sm:text-[0.55rem]' : 'h-5 text-[0.5rem] sm:h-6 sm:text-[0.6rem]',
        lit
          ? main
            ? 'z-10 scale-[1.08] border-violet-900 bg-gradient-to-b from-violet-400 to-violet-600 text-white shadow-[0_0_20px_4px_rgba(139,92,246,0.75)]'
            : 'border-cyan-800 bg-gradient-to-b from-cyan-400 to-cyan-600 text-white shadow-[0_0_14px_2px_rgba(34,211,238,0.55)]'
          : 'border-black/60 bg-gradient-to-b from-neutral-600 to-neutral-700 text-neutral-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]',
      )}
    >
      {label}
    </span>
  );
}

function range(prefix: string, from: number, to: number): Key[] {
  const keys: Key[] = [];
  for (let i = from; i <= to; i++) keys.push({ code: `${prefix}${i}` });
  return keys;
}

function digits(): Key[] {
  return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => ({ code: `Digit${d}` }));
}

function letters(seq: string): Key[] {
  return [...seq].map((c) => ({ code: `Key${c}` }));
}
