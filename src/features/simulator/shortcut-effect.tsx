'use client';

import {
  INITIAL_SIM_STATE,
  actionForShortcut,
  applySimAction,
  type SimAction,
  type SimState,
} from '@/core/simulator';
import type { Locale, ShortcutDefinition } from '@/core/content';
import { SimulatorDesktop } from './desktop';
import { editingDemoFor } from './editing-demos';
import { EditorDemo } from './text-editor-demo';

/**
 * The single source of truth for "show what this shortcut does on Windows".
 * `after` is the before→after flip: false shows the starting state, true the
 * performed effect. Shared by the lesson teach card (auto-plays it) and the
 * practice drill (flips it when you press the keys correctly), so learning
 * and practising use the exact same Windows 11 reaction.
 */
export function ShortcutEffect({
  shortcut,
  after,
  locale,
}: {
  shortcut: ShortcutDefinition;
  after: boolean;
  locale: Locale;
}) {
  const editing = editingDemoFor(shortcut.id);
  if (editing) return <EditorDemo kind={editing} after={after} />;

  const action = actionForShortcut(shortcut.id);
  if (action) {
    const state = after ? applySimAction(seedFor(action), action) : seedFor(action);
    const snipSeq = action.kind === 'snip' && after ? 1 : 0;
    return <SimulatorDesktop state={state} snipSeq={snipSeq} />;
  }

  // No window/editing effect: raise a Windows notification with the name.
  return (
    <SimulatorDesktop
      state={seedFor(null)}
      snipSeq={0}
      toast={after ? shortcut.name[locale] : null}
    />
  );
}

/**
 * A meaningful before-state: app-opening shortcuts start on a bare desktop so
 * the window appearing is visible; everything else starts with windows open
 * so snaps, switches, desktop tricks and notifications have a populated screen.
 */
export function seedFor(action: SimAction | null): SimState {
  if (action?.kind === 'open-app') return INITIAL_SIM_STATE;
  let state = applySimAction(INITIAL_SIM_STATE, { kind: 'open-app', app: 'explorer' });
  state = applySimAction(state, { kind: 'open-app', app: action ? 'settings' : 'notepad' });
  return state;
}
