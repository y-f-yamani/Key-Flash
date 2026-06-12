'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KeyCombo } from '@/components/shared/key-combo';
import type { ShortcutDefinition } from '@/core/content';
import { useI18n } from '@/lib/i18n/provider';
import { useKeyCapture, type CaptureResult } from './use-key-capture';

interface CaptureDrillProps {
  shortcut: ShortcutDefinition;
  onResult: (result: { correct: boolean; reactionMs: number }) => void;
}

/**
 * One live-capture drill: shows the action, the user must press the real
 * keys. Feedback (correct/wrong + reaction time) then a Next button so the
 * learner controls pacing.
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

  return (
    <Card ref={cardRef} data-testid="capture-drill">
      <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
        <h2 className="text-2xl font-bold">{shortcut.name[locale]}</h2>
        <p className="text-muted-foreground">{shortcut.description[locale]}</p>

        {result === null ? (
          <>
            <Badge variant="accent" className="animate-pulse">
              {dict.practice.pressKeys}
              {shortcut.keys.length > 1 && ` (${stepIndex + 1}/${shortcut.keys.length})`}
            </Badge>
            {needsMetaRemap && (
              <p className="max-w-sm text-xs text-muted-foreground">
                {dict.practice.metaRemapNote}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
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
                {result.pressed && (
                  <p className="text-sm text-muted-foreground">
                    {dict.practice.youPressed} <KeyCombo keys={[result.pressed]} />
                  </p>
                )}
              </>
            )}
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-muted-foreground">{dict.practice.expected}</span>
              <KeyCombo keys={shortcut.keys} size="lg" />
            </div>
            <Button autoFocus onClick={next} data-testid="drill-next">
              {dict.practice.next}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
