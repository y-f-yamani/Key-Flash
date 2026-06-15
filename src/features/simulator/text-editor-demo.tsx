'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Clipboard, ClipboardCheck, FileText } from 'lucide-react';
import { WindowControls, WindowsScreen } from './desktop';
import { cn } from '@/lib/utils';
import type { EditingDemoKind } from './editing-demos';

/**
 * Animates a Notepad document like a real OS: for the clipboard family the
 * mouse pointer moves to the text, drag-selects it, copies, then moves to
 * another spot to paste. `play` triggers the sequence (auto in the lesson
 * teach card, on a correct key-press in the practice drill).
 */

const SELECTION = 'quick brown';
const STEP_MS = 850;

interface Frame {
  cursor?: { x: number; y: number };
  sel?: boolean;
  inserted?: boolean;
  removed?: boolean;
  caret?: { x: number; y: number };
  clip?: boolean;
  keys?: string;
}

/** Mouse-driven sequences for the clipboard family (the OS-like demos). */
const SEQUENCES: Partial<Record<EditingDemoKind, Frame[]>> = {
  copy: [
    { cursor: { x: 55, y: 78 } },
    { cursor: { x: 14, y: 17 } },
    { cursor: { x: 45, y: 17 }, sel: true },
    { cursor: { x: 45, y: 17 }, sel: true, keys: 'Ctrl + C' },
    { cursor: { x: 45, y: 17 }, sel: true, clip: true },
  ],
  cut: [
    { cursor: { x: 55, y: 78 } },
    { cursor: { x: 14, y: 17 } },
    { cursor: { x: 45, y: 17 }, sel: true },
    { cursor: { x: 45, y: 17 }, sel: true, keys: 'Ctrl + X' },
    { cursor: { x: 30, y: 17 }, removed: true, clip: true },
  ],
  paste: [
    { cursor: { x: 45, y: 17 }, clip: true },
    { cursor: { x: 62, y: 30 }, clip: true },
    { cursor: { x: 62, y: 30 }, clip: true, caret: { x: 62, y: 30 }, keys: 'Ctrl + V' },
    { cursor: { x: 62, y: 30 }, clip: true, inserted: true },
  ],
};

export function EditorDemo({ kind, play }: { kind: EditingDemoKind; play: boolean }) {
  const sequence = SEQUENCES[kind];
  if (sequence) return <AnimatedEditor kind={kind} play={play} frames={sequence} />;
  // Non-mouse shortcuts (select-all, undo, redo, save) just toggle state.
  return <StaticEditor kind={kind} after={play} />;
}

/** The clipboard demos with a moving pointer. */
function AnimatedEditor({
  kind,
  play,
  frames,
}: {
  kind: EditingDemoKind;
  play: boolean;
  frames: Frame[];
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!play) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      if (i >= frames.length) {
        window.clearInterval(id);
        return;
      }
      setStep(i);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [play, frames]);

  const frame = play ? frames[Math.min(step, frames.length - 1)] : frames[0];

  return (
    <Notepad>
      <Doc>
        <p>
          The{' '}
          {frame.removed ? <Caret inline /> : <Sel show={frame.sel}>{SELECTION}</Sel>} fox
        </p>
        <p>
          jumps over the lazy dog.
          {kind === 'paste' && frame.inserted && (
            <>
              {' '}
              <Sel show green>
                {SELECTION}
              </Sel>
            </>
          )}
        </p>
      </Doc>

      {frame.clip && <ClipChip captured={kind !== 'paste'} />}
      {frame.caret && <BlinkCaret x={frame.caret.x} y={frame.caret.y} />}
      {frame.keys && <KeyFlash keys={frame.keys} />}
      {frame.cursor && <MousePointer x={frame.cursor.x} y={frame.cursor.y} />}
    </Notepad>
  );
}

/** select-all / undo / redo / save — simple before→after, no pointer. */
function StaticEditor({ kind, after }: { kind: EditingDemoKind; after: boolean }) {
  const saved = kind === 'save' && after;
  return (
    <Notepad saved={saved}>
      <Doc>
        {kind === 'selectAll' ? (
          <>
            <p>{after ? <Sel show>The {SELECTION} fox</Sel> : <>The {SELECTION} fox</>}</p>
            <p>{after ? <Sel show>jumps over the lazy dog.</Sel> : 'jumps over the lazy dog.'}</p>
          </>
        ) : (
          <>
            <p>The {SELECTION} fox</p>
            <p>
              jumps over the lazy dog.
              {kind === 'undo' && !after && (
                <>
                  {' '}
                  <Sel show green>
                    EDITED
                  </Sel>
                </>
              )}
              {kind === 'redo' && after && (
                <>
                  {' '}
                  <Sel show green>
                    EDITED
                  </Sel>
                </>
              )}
            </p>
          </>
        )}
      </Doc>
      {after && (kind === 'undo' || kind === 'redo' || kind === 'selectAll' || kind === 'save') && (
        <KeyFlash keys={KEYS[kind]} />
      )}
    </Notepad>
  );
}

const KEYS: Record<string, string> = {
  selectAll: 'Ctrl + A',
  undo: 'Ctrl + Z',
  redo: 'Ctrl + Y',
  save: 'Ctrl + S',
};

/** The Notepad window chrome + a relative body for absolute overlays. */
function Notepad({ children, saved }: { children: ReactNode; saved?: boolean }) {
  return (
    <WindowsScreen openApps={new Set(['notepad'])}>
      <div className="animate-window-in absolute left-[8%] top-[7%] flex h-[82%] w-[84%] flex-col overflow-hidden rounded-lg border border-white/15 bg-neutral-900/85 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between bg-white/5 ps-3">
          <span className="flex items-center gap-2 py-1.5 text-xs font-medium text-neutral-100">
            <FileText className="size-3.5 text-blue-300" aria-hidden />
            Untitled — Notepad
            {saved ? (
              <span className="text-emerald-400">✓ Saved</span>
            ) : (
              <span className="text-amber-400" title="Unsaved">
                ●
              </span>
            )}
          </span>
          <WindowControls />
        </div>
        <div className="relative flex-1 bg-neutral-50 p-4 font-mono text-sm leading-relaxed text-neutral-800">
          {children}
        </div>
      </div>
    </WindowsScreen>
  );
}

function Doc({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

function Sel({ children, show, green }: { children: ReactNode; show?: boolean; green?: boolean }) {
  return (
    <span
      className={cn(
        'rounded px-0.5 transition-colors',
        show && (green ? 'bg-emerald-400/50 text-neutral-900' : 'bg-sky-400/70 text-neutral-900'),
      )}
    >
      {children}
    </span>
  );
}

function Caret({ inline }: { inline?: boolean }) {
  return (
    <span className={cn('inline-block w-0.5 animate-pulse bg-neutral-800', inline ? 'h-3.5' : 'h-3')}>
      &nbsp;
    </span>
  );
}

function BlinkCaret({ x, y }: { x: number; y: number }) {
  return (
    <span
      style={{ left: `${x}%`, top: `${y}%` }}
      className="absolute h-4 w-0.5 animate-pulse bg-neutral-800"
      aria-hidden
    />
  );
}

/** The animated OS mouse pointer. */
function MousePointer({ x, y }: { x: number; y: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      style={{ left: `${x}%`, top: `${y}%`, transition: 'left 700ms ease, top 700ms ease' }}
      className="pointer-events-none absolute z-20 size-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
      aria-hidden
    >
      <path d="M5 2.5 L5 19 L9.5 14.5 L12.5 21 L15 20 L12 13.5 L18.5 13.5 Z" fill="white" stroke="black" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

/** A small badge showing the shortcut keys being "pressed". */
function KeyFlash({ keys }: { keys: string }) {
  return (
    <div className="animate-pop absolute left-1/2 top-1.5 z-20 -translate-x-1/2 rounded-md bg-neutral-900/85 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg">
      {keys}
    </div>
  );
}

function ClipChip({ captured }: { captured: boolean }) {
  return (
    <div
      className={cn(
        'absolute end-3 top-3 flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-sky-700 shadow-md',
        captured && 'animate-pop',
      )}
    >
      {captured ? <ClipboardCheck className="size-3.5" /> : <Clipboard className="size-3.5" />}
      <span className="font-medium">{SELECTION}</span>
    </div>
  );
}
