'use client';

import type { ReactNode } from 'react';
import { Clipboard, ClipboardCheck, FileText } from 'lucide-react';
import { WindowControls, WindowsScreen } from '@/features/simulator/desktop';
import { cn } from '@/lib/utils';
import type { EditingDemoKind } from './editing-demos';

/**
 * Animates a Notepad document to show what an editing shortcut does — real
 * "select → copied", paste, undo, save — inside the Windows 11 screen. Pure
 * render of (kind, after); the teach card flips `after` to play the effect.
 */

const SELECTION = 'quick brown';

export function EditorDemo({ kind, after }: { kind: EditingDemoKind; after: boolean }) {
  const saved = kind === 'save' && after;

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
          <Body kind={kind} after={after} />
          <ClipChip kind={kind} after={after} />
        </div>
      </div>
    </WindowsScreen>
  );
}

function Sel({ children, green }: { children: ReactNode; green?: boolean }) {
  return (
    <span
      className={cn(
        'rounded px-0.5',
        green ? 'bg-emerald-400/50 text-neutral-900' : 'bg-sky-400/70 text-neutral-900',
      )}
    >
      {children}
    </span>
  );
}

function Caret() {
  return <span className="ms-px inline-block w-0.5 animate-pulse bg-neutral-800">&nbsp;</span>;
}

function Body({ kind, after }: { kind: EditingDemoKind; after: boolean }) {
  switch (kind) {
    case 'copy':
      return (
        <Doc>
          <p>
            The <Sel>{SELECTION}</Sel> fox
          </p>
          <p>jumps over the lazy dog.</p>
        </Doc>
      );
    case 'cut':
      return (
        <Doc>
          <p>The {after ? <Caret /> : <Sel>{SELECTION}</Sel>} fox</p>
          <p>jumps over the lazy dog.</p>
        </Doc>
      );
    case 'paste':
      return (
        <Doc>
          <p>The fox</p>
          <p>
            jumps over the lazy dog.{' '}
            {after ? <Sel green>{SELECTION}</Sel> : <Caret />}
          </p>
        </Doc>
      );
    case 'selectAll':
      return (
        <Doc>
          <p>{after ? <Sel>The {SELECTION} fox</Sel> : <>The {SELECTION} fox</>}</p>
          <p>{after ? <Sel>jumps over the lazy dog.</Sel> : 'jumps over the lazy dog.'}</p>
        </Doc>
      );
    case 'undo':
      return (
        <Doc>
          <p>The {SELECTION} fox</p>
          <p>
            jumps over the lazy dog.{!after && <> <Sel green>EDITED</Sel></>}
          </p>
        </Doc>
      );
    case 'redo':
      return (
        <Doc>
          <p>The {SELECTION} fox</p>
          <p>
            jumps over the lazy dog.{after && <> <Sel green>EDITED</Sel></>}
          </p>
        </Doc>
      );
    case 'save':
      return (
        <Doc>
          <p>The {SELECTION} fox</p>
          <p>jumps over the lazy dog.</p>
        </Doc>
      );
  }
}

function Doc({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

/** The clipboard indicator — appears when content has been copied/cut/pasted. */
function ClipChip({ kind, after }: { kind: EditingDemoKind; after: boolean }) {
  const content =
    kind === 'copy' || kind === 'cut' ? (after ? SELECTION : null) : kind === 'paste' ? SELECTION : null;
  if (!content) return null;

  const justCaptured = (kind === 'copy' || kind === 'cut') && after;
  return (
    <div
      className={cn(
        'absolute end-3 top-3 flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-sky-700 shadow-md',
        justCaptured && 'animate-pop',
      )}
    >
      {justCaptured ? <ClipboardCheck className="size-3.5" /> : <Clipboard className="size-3.5" />}
      <span className="font-medium">{content}</span>
    </div>
  );
}
