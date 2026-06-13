'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, RotateCcw } from 'lucide-react';
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
import { useI18n } from '@/lib/i18n/provider';

/**
 * The "Learn" half of a lesson: before any testing, walk through each
 * shortcut showing the highlighted keyboard and — for simulator-capable
 * shortcuts — a live preview that performs the action so the learner SEES
 * what it does. Then hand off to the drill (the "test").
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
  const action = actionForShortcut(shortcut.id);

  return (
    <Card data-testid="lesson-teach">
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
        <Badge variant="accent">
          <GraduationCap className="size-3.5" /> {dict.learn.learnBadge}
        </Badge>
        <h2 className="text-2xl font-bold">{shortcut.name[locale]}</h2>
        <p className="max-w-md text-muted-foreground">{shortcut.description[locale]}</p>

        <KeyCombo keys={shortcut.keys} size="lg" />
        <KeyboardView keys={shortcut.keys} />

        {action && (
          <TeachSim key={shortcut.id} action={action} replayLabel={dict.learn.replay} />
        )}

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
 * Auto-playing simulator preview for one shortcut's action. Mounted with a
 * key per shortcut, so it starts seeded and animates once; "Replay" re-arms.
 */
function TeachSim({ action, replayLabel }: { action: SimAction; replayLabel: string }) {
  const [state, setState] = useState<SimState>(() => seedFor(action));
  const [snipSeq, setSnipSeq] = useState(0);
  const [arm, setArm] = useState(0);

  // Show the seeded "before", then perform the action so the change is visible.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (action.kind === 'snip') setSnipSeq((n) => n + 1);
      setState(applySimAction(seedFor(action), action));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [action, arm]);

  function replay() {
    setState(seedFor(action));
    setArm((n) => n + 1);
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <SimulatorDesktop state={state} snipSeq={snipSeq} />
      <Button variant="ghost" size="sm" onClick={replay}>
        <RotateCcw className="size-3.5" /> {replayLabel}
      </Button>
    </div>
  );
}

/**
 * A meaningful before-state for the preview: app-opening shortcuts start on a
 * bare desktop so the window appearing is visible; everything else starts
 * with two windows open so snaps, switches and desktop tricks have something
 * to act on.
 */
function seedFor(action: SimAction): SimState {
  if (action.kind === 'open-app') return INITIAL_SIM_STATE;
  let state = applySimAction(INITIAL_SIM_STATE, { kind: 'open-app', app: 'explorer' });
  state = applySimAction(state, { kind: 'open-app', app: 'settings' });
  return state;
}
