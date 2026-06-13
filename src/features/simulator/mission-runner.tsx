'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, SkipForward } from 'lucide-react';
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
import { WinKeyHint, useWinKeyMode } from '@/features/practice/win-key-mode';
import { useI18n } from '@/lib/i18n/provider';
import { SimulatorDesktop } from './desktop';

/**
 * Mission script: each step is a catalog shortcut the user must physically
 * press; the simulated desktop reacts like Windows. Order tells a story —
 * open apps, switch between them (Tab shortcuts!), arrange them, tour the
 * desktops, end with a screenshot. Alt+Tab and Win+Tab work with the
 * Ctrl+Alt stand-in or, best, the real keys in ⊞ fullscreen mode.
 */
const DEFAULT_MISSION_SHORTCUTS = [
  'win11.win-e',
  'win11.win-i',
  'win11.alt-tab',
  'win11.win-up',
  'win11.win-left',
  'win11.win-right',
  'win11.win-down',
  'win11.win-tab',
  'win11.win-d',
  'win11.win-v',
  'win11.win-ctrl-d',
  'win11.win-ctrl-left',
  'win11.win-shift-s',
] as const;

const SUCCESS_PAUSE_MS = 900;

/**
 * Tab combos are OS-owned: without the full Keyboard Lock (⊞ fullscreen
 * mode) the browser never receives them, so these missions offer a skip.
 */
const LOCK_REQUIRED = new Set(['win11.alt-tab', 'win11.win-tab']);

/**
 * Drives the Windows simulator through a mission script.
 *
 * Standalone sandbox (`/simulator`) uses the default narrative script; a
 * category capstone passes that category's simulator-mappable shortcuts plus
 * `completeHref` so finishing returns to the Learning Path.
 */
export function MissionRunner({
  missionShortcutIds = DEFAULT_MISSION_SHORTCUTS,
  completeHref,
  completeLabel,
}: {
  missionShortcutIds?: readonly string[];
  completeHref?: string;
  completeLabel?: string;
} = {}) {
  const { locale, dict } = useI18n();
  const { recordDrill, completeLesson } = useProgress();

  const missions = missionShortcutIds;
  const [simState, setSimState] = useState<SimState>(INITIAL_SIM_STATE);
  const [missionIndex, setMissionIndex] = useState(0);
  const [justSucceeded, setJustSucceeded] = useState(false);
  const [snipSeq, setSnipSeq] = useState(0);
  const lessonAwarded = useRef(false);

  const done = missionIndex >= missions.length;
  const shortcut = done ? null : registry.getShortcut(missions[missionIndex]);
  const { active: winKeyActive } = useWinKeyMode();
  const offerSkip = !done && !!shortcut && LOCK_REQUIRED.has(shortcut.id) && !winKeyActive;

  const handleResult = useCallback(
    ({ correct, reactionMs }: { correct: boolean; reactionMs: number }) => {
      const current = registry.getShortcut(missions[missionIndex]);
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
    [missions, missionIndex, justSucceeded, recordDrill],
  );

  // Brief success pause so the desktop reaction is visible, then advance.
  useEffect(() => {
    if (!justSucceeded) return;
    const timer = window.setTimeout(() => {
      setJustSucceeded(false);
      setMissionIndex((i) => {
        const next = i + 1;
        if (next >= missions.length && !lessonAwarded.current) {
          lessonAwarded.current = true;
          completeLesson();
        }
        return next;
      });
    }, SUCCESS_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [justSucceeded, completeLesson, missions.length]);

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

  /** Skip an OS-owned mission without XP — nobody gets stuck outside ⊞ mode. */
  function skipMission() {
    const current = registry.getShortcut(missions[missionIndex]);
    const action = current ? actionForShortcut(current.id) : null;
    if (action) {
      // The desktop still reacts, so the story stays coherent.
      if (action.kind === 'snip') setSnipSeq((n) => n + 1);
      setSimState((state) => applySimAction(state, action));
    }
    setJustSucceeded(true);
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
              {completeHref ? (
                <Link href={completeHref}>
                  <Button>{completeLabel ?? dict.simulator.restart}</Button>
                </Link>
              ) : (
                <Button onClick={restart}>{dict.simulator.restart}</Button>
              )}
            </div>
          ) : (
            shortcut && (
              <>
                <div className="flex items-center gap-3">
                  <ProgressBar value={missionIndex / missions.length} className="flex-1" />
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {dict.simulator.mission} {missionIndex + 1} / {missions.length}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
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
                {offerSkip && !justSucceeded && (
                  <div className="flex flex-col items-center gap-2 rounded-lg bg-muted px-3 py-2 text-center text-xs">
                    <span>{dict.simulator.needsWinMode}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={skipMission}
                      data-testid="mission-skip"
                    >
                      <SkipForward className="size-3.5" /> {dict.simulator.skip}
                    </Button>
                  </div>
                )}
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
