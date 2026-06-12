'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { KeyCombo } from '@/components/shared/key-combo';
import { KeycapBuddy } from '@/components/shared/keycap-buddy';
import { registry } from '@/content';
import {
  INITIAL_SIM_STATE,
  actionForShortcut,
  applySimAction,
  type SimState,
} from '@/core/simulator';
import { useProgress } from '@/features/progress';
import { useKeyCapture } from '@/features/practice/use-key-capture';
import { WinKeyHint } from '@/features/practice/win-key-mode';
import { useI18n } from '@/lib/i18n/provider';
import { SimulatorDesktop } from './desktop';

/**
 * Mission script: each step is a catalog shortcut the user must physically
 * press; the simulated desktop reacts like Windows. Order tells a story —
 * open apps, arrange them, peek at the desktop, end with a screenshot.
 */
const MISSION_SHORTCUTS = [
  'win11.win-e',
  'win11.win-i',
  'win11.win-up',
  'win11.win-left',
  'win11.win-right',
  'win11.win-down',
  'win11.win-d',
  'win11.win-v',
  'win11.win-ctrl-d',
  'win11.win-ctrl-left',
  'win11.win-shift-s',
] as const;

const SUCCESS_PAUSE_MS = 900;

export function MissionRunner() {
  const { locale, dict } = useI18n();
  const { recordDrill, completeLesson } = useProgress();

  const [simState, setSimState] = useState<SimState>(INITIAL_SIM_STATE);
  const [missionIndex, setMissionIndex] = useState(0);
  const [justSucceeded, setJustSucceeded] = useState(false);
  const [snipSeq, setSnipSeq] = useState(0);
  const lessonAwarded = useRef(false);

  const done = missionIndex >= MISSION_SHORTCUTS.length;
  const shortcut = done ? null : registry.getShortcut(MISSION_SHORTCUTS[missionIndex]);

  const handleResult = useCallback(
    ({ correct, reactionMs }: { correct: boolean; reactionMs: number }) => {
      const current = registry.getShortcut(MISSION_SHORTCUTS[missionIndex]);
      if (!current || justSucceeded) return;
      recordDrill({ shortcutId: current.id, correct, reactionMs }, current.difficulty);
      if (!correct) return; // matcher already reset; let them retry

      const action = actionForShortcut(current.id);
      if (action) {
        if (action.kind === 'snip') setSnipSeq((n) => n + 1);
        setSimState((state) => applySimAction(state, action));
      }
      setJustSucceeded(true);
    },
    [missionIndex, justSucceeded, recordDrill],
  );

  // Brief success pause so the desktop reaction is visible, then advance.
  useEffect(() => {
    if (!justSucceeded) return;
    const timer = window.setTimeout(() => {
      setJustSucceeded(false);
      setMissionIndex((i) => {
        const next = i + 1;
        if (next >= MISSION_SHORTCUTS.length && !lessonAwarded.current) {
          lessonAwarded.current = true;
          completeLesson();
        }
        return next;
      });
    }, SUCCESS_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [justSucceeded, completeLesson]);

  useKeyCapture({
    keys: shortcut?.keys ?? [],
    enabled: !done && !justSucceeded && shortcut !== null,
    onResult: handleResult,
  });

  function restart() {
    lessonAwarded.current = false;
    setSimState(INITIAL_SIM_STATE);
    setMissionIndex(0);
    setJustSucceeded(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4" data-testid="mission-bar">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <KeycapBuddy mood="cheer" size={100} className="animate-pop" />
              <h2 className="text-xl font-bold">{dict.simulator.allDoneTitle}</h2>
              <p className="text-sm text-muted-foreground">{dict.simulator.allDoneBody}</p>
              <Button onClick={restart}>{dict.simulator.restart}</Button>
            </div>
          ) : (
            shortcut && (
              <>
                <div className="flex items-center gap-3">
                  <ProgressBar
                    value={missionIndex / MISSION_SHORTCUTS.length}
                    className="flex-1"
                  />
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {dict.simulator.mission} {missionIndex + 1} / {MISSION_SHORTCUTS.length}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{shortcut.name[locale]}</p>
                    <p className="text-sm text-muted-foreground">
                      {shortcut.description[locale]}
                    </p>
                  </div>
                  {justSucceeded ? (
                    <Badge variant="success" className="px-3 py-1 text-sm" data-testid="mission-done">
                      <Check className="size-4" /> {dict.simulator.missionDone}
                    </Badge>
                  ) : (
                    <KeyCombo keys={shortcut.keys} />
                  )}
                </div>
                <WinKeyHint />
              </>
            )
          )}
        </CardContent>
      </Card>

      <SimulatorDesktop state={simState} snipSeq={snipSeq} />
    </div>
  );
}
