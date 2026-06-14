'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KeyCombo } from '@/components/shared/key-combo';
import type { ShortcutDefinition } from '@/core/content';
import { ShortcutEffect } from '@/features/simulator/shortcut-effect';
import { useI18n } from '@/lib/i18n/provider';
import { useKeyCapture, type CaptureResult } from './use-key-capture';
import { WinKeyHint } from './win-key-mode';

interface CaptureDrillProps {
  shortcut: ShortcutDefinition;
  onResult: (result: { correct: boolean; reactionMs: number }) => void;
}

/**
 * One live-capture drill. The Windows 11 screen is shown the whole time and
 * REACTS when you press the shortcut correctly — practice and the simulator
 * are the same moment. Feedback (correct/wrong + reaction time) then a Next
 * button so the learner controls pacing.
 */
export function CaptureDrill({ shortcut, onResult }: CaptureDrillProps) {
  const { locale, dict } = useI18n();
  const [result, setResult] = useState<CaptureResult | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { stepIndex, needsMetaRemap } = useKeyCapture({
    keys: shortcut.keys,
    enabled: result === null,
    onResult: setResult,
  });

  // Effects run in declaration order, so this fires after useKeyCapture has
  // attached its listener — "armed" in the DOM means key presses will land.
  // Tests (and tools) wait on it instead of racing the mount.
  useEffect(() => {
    cardRef.current?.setAttribute('data-armed', String(result === null));
  }, [result]);

  function next() {
    if (!result) return;
    onResult({ correct: result.correct, reactionMs: result.reactionMs });
  }

  const succeeded = result?.correct === true;

  return (
    <Card ref={cardRef} data-testid="capture-drill">
      <CardContent className="flex flex-col items-center gap-4 p-5 text-center sm:p-6">
        <h2 className="text-xl font-bold sm:text-2xl">{shortcut.name[locale]}</h2>
        <p className="text-sm text-muted-foreground">{shortcut.description[locale]}</p>

        {/* Live Windows 11 screen — performs the action the instant you nail it. */}
        <div className="w-full max-w-2xl">
          <ShortcutEffect shortcut={shortcut} after={succeeded} locale={locale} />
        </div>

        {result === null ? (
          <>
            <Badge variant="accent" className="animate-pulse">
              {dict.practice.pressKeys}
              {shortcut.keys.length > 1 && ` (${stepIndex + 1}/${shortcut.keys.length})`}
            </Badge>
            <WinKeyHint show={needsMetaRemap} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {result.correct ? (
              <Badge variant="success" className="px-4 py-1.5 text-sm">
                <Check className="size-4" /> {dict.practice.correctLabel}{' '}
                <span className="tabular-nums">{Math.round(result.reactionMs)} ms</span>
              </Badge>
            ) : (
              <>
                <Badge variant="danger" className="px-4 py-1.5 text-sm">
                  <X className="size-4" /> {dict.practice.wrongLabel}
                </Badge>
                <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                  {result.pressed && (
                    <>
                      {dict.practice.youPressed} <KeyCombo keys={[result.pressed]} />
                    </>
                  )}
                  <span className="mx-1">·</span>
                  {dict.practice.expected} <KeyCombo keys={shortcut.keys} />
                </p>
              </>
            )}
            <Button autoFocus onClick={next} data-testid="drill-next">
              {dict.practice.next}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
