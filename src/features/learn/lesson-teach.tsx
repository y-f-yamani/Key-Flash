'use client';

import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { KeyCombo } from '@/components/shared/key-combo';
import { KeyboardView } from '@/components/shared/keyboard-view';
import {
  INITIAL_SIM_STATE,
  actionForShortcut,
  applySimAction,
  type SimAction,
  type SimState,
} from '@/core/simulator';
import type { ShortcutDefinition } from '@/core/content';
import { SimulatorDesktop } from '@/features/simulator/desktop';
import { ExpandableScreen } from '@/features/simulator/expandable-screen';
import { useI18n } from '@/lib/i18n/provider';
import { editingDemoFor } from './editing-demos';
import { EditorDemo } from './text-editor-demo';

/**
 * The "Learn" half of a lesson: before any testing, walk through each
 * shortcut showing the Windows 11 screen reacting (so the effect is concrete)
 * and the highlighted keyboard. Then hand off to the drill (the "test").
 */
export function LessonTeach({
  shortcuts,
  onDone,
}: {
  shortcuts: readonly ShortcutDefinition[];
  onDone: () => void;
}) {
  const { locale, dict } = useI18n();
  const [index, setIndex] = useState(0);
  const shortcut = shortcuts[index];
  const isLast = index >= shortcuts.length - 1;

  return (
    <Card data-testid="lesson-teach">
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
        <Badge variant="accent">
          <GraduationCap className="size-3.5" /> {dict.learn.learnBadge}
        </Badge>
        <h2 className="text-2xl font-bold">{shortcut.name[locale]}</h2>
        <p className="max-w-md text-muted-foreground">{shortcut.description[locale]}</p>

        <KeyCombo keys={shortcut.keys} size="lg" />

        {/* Simulator above the keyboard: see the effect, then the keys. */}
        <TeachPreview key={shortcut.id} shortcut={shortcut} />
        <KeyboardView keys={shortcut.keys} />

        <div className="flex w-full max-w-md items-center gap-3">
          <ProgressBar value={(index + 1) / shortcuts.length} className="flex-1" />
          <span className="text-sm tabular-nums text-muted-foreground">
            {index + 1} / {shortcuts.length}
          </span>
        </div>

        <Button
          size="lg"
          autoFocus
          data-testid="teach-next"
          onClick={() => (isLast ? onDone() : setIndex(index + 1))}
        >
          {isLast ? dict.learn.practice : dict.learn.next}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * The Windows 11 preview for one shortcut. Window shortcuts perform their
 * action on screen; editing shortcuts animate a Notepad document (real
 * copy/paste/undo/save); the rest raise a notification toast. Mounted with a
 * key per shortcut so it starts fresh and animates once; Replay re-arms.
 */
function TeachPreview({ shortcut }: { shortcut: ShortcutDefinition }) {
  const { locale, dict } = useI18n();
  const editing = editingDemoFor(shortcut.id);
  const action = actionForShortcut(shortcut.id);

  const [after, setAfter] = useState(false);
  const [arm, setArm] = useState(0);

  // Show the "before", then flip to "after" so the change is visible.
  useEffect(() => {
    const timer = window.setTimeout(() => setAfter(true), 750);
    return () => window.clearTimeout(timer);
  }, [arm]);

  function replay() {
    setAfter(false);
    setArm((n) => n + 1);
  }

  let screen;
  if (editing) {
    screen = <EditorDemo kind={editing} after={after} />;
  } else if (action) {
    const state = after ? applySimAction(seedFor(action), action) : seedFor(action);
    const snipSeq = action.kind === 'snip' && after ? 1 : 0;
    screen = <SimulatorDesktop state={state} snipSeq={snipSeq} />;
  } else {
    screen = (
      <SimulatorDesktop
        state={seedFor(null)}
        snipSeq={0}
        toast={after ? shortcut.name[locale] : null}
      />
    );
  }

  return (
    <ExpandableScreen onReplay={replay} replayLabel={dict.learn.replay} expandLabel={dict.learn.expand}>
      {screen}
    </ExpandableScreen>
  );
}

/**
 * A meaningful before-state for the preview: app-opening shortcuts start on a
 * bare desktop so the window appearing is visible; everything else starts
 * with windows open so snaps, switches, desktop tricks and notifications have
 * a populated screen behind them.
 */
function seedFor(action: SimAction | null): SimState {
  if (action?.kind === 'open-app') return INITIAL_SIM_STATE;
  let state = applySimAction(INITIAL_SIM_STATE, { kind: 'open-app', app: 'explorer' });
  state = applySimAction(state, { kind: 'open-app', app: action ? 'settings' : 'notepad' });
  return state;
}
