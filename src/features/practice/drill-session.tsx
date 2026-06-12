'use client';

import { useState } from 'react';
import { PartyPopper } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import type { ShortcutDefinition } from '@/core/content';
import { useProgress, type DrillOutcome } from '@/features/progress';
import { useI18n } from '@/lib/i18n/provider';
import { CaptureDrill } from './capture-drill';
import { QuizDrill } from './quiz-drill';

interface DrillSessionProps {
  shortcuts: readonly ShortcutDefinition[];
  /** Extra XP message + callback when every drill is finished. */
  onComplete?: (results: readonly DrillOutcome[]) => void;
  completeAction?: { label: string; onClick: () => void };
}

/**
 * Runs a list of shortcuts as sequential drills. Capturable shortcuts use
 * live key capture; browser-reserved ones fall back to recall quizzes
 * (ADR-0004). Every outcome feeds SRS + XP through the progress provider.
 */
export function DrillSession({ shortcuts, onComplete, completeAction }: DrillSessionProps) {
  const { dict } = useI18n();
  const { recordDrill } = useProgress();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<DrillOutcome[]>([]);

  const finished = index >= shortcuts.length;

  function handleResult(result: { correct: boolean; reactionMs: number }) {
    const shortcut = shortcuts[index];
    const outcome: DrillOutcome = { shortcutId: shortcut.id, ...result };
    recordDrill(outcome, shortcut.difficulty);

    const nextResults = [...results, outcome];
    setResults(nextResults);
    setIndex(index + 1);
    if (index + 1 >= shortcuts.length) onComplete?.(nextResults);
  }

  if (shortcuts.length === 0) return null;

  if (finished) {
    const correct = results.filter((r) => r.correct).length;
    return (
      <Card data-testid="session-complete">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <PartyPopper className="size-10 text-primary" aria-hidden />
          <h2 className="text-2xl font-bold">{dict.practice.sessionComplete}</h2>
          <Badge variant="success" className="px-4 py-1.5 text-sm">
            {dict.common.correct}: {correct} / {results.length}
          </Badge>
          {completeAction && (
            <Button autoFocus onClick={completeAction.onClick}>
              {completeAction.label}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const shortcut = shortcuts[index];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ProgressBar value={index / shortcuts.length} className="flex-1" />
        <span className="text-sm tabular-nums text-muted-foreground">
          {index + 1} / {shortcuts.length}
        </span>
      </div>
      {shortcut.capturable === 'none' ? (
        <QuizDrill key={shortcut.id} shortcut={shortcut} onResult={handleResult} />
      ) : (
        <CaptureDrill key={shortcut.id} shortcut={shortcut} onResult={handleResult} />
      )}
    </div>
  );
}
