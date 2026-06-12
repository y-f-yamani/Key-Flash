'use client';

import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KeyCombo } from '@/components/shared/key-combo';
import { registry } from '@/content';
import type { ShortcutDefinition } from '@/core/content';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { sequencesEqual } from './use-key-capture';

interface QuizDrillProps {
  shortcut: ShortcutDefinition;
  onResult: (result: { correct: boolean; reactionMs: number }) => void;
}

/**
 * Recall drill for shortcuts the browser cannot capture (Win+L, Alt+Tab — see
 * ADR-0004): pick the right combo from four options. Reaction time runs from
 * render to choice so these drills still feed the same SRS grading.
 */
export function QuizDrill({ shortcut, onResult }: QuizDrillProps) {
  const { locale, dict } = useI18n();
  const [chosen, setChosen] = useState<number | null>(null);
  const [shownAt] = useState(() => performance.now());

  const options = useMemo(() => buildOptions(shortcut), [shortcut]);
  const correctIndex = options.findIndex((o) => o.id === shortcut.id);

  function choose(index: number) {
    if (chosen !== null) return;
    setChosen(index);
  }

  function next() {
    if (chosen === null) return;
    onResult({ correct: chosen === correctIndex, reactionMs: performance.now() - shownAt });
  }

  return (
    <Card data-testid="quiz-drill">
      <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
        <h2 className="text-2xl font-bold">{shortcut.name[locale]}</h2>
        <p className="text-muted-foreground">{shortcut.description[locale]}</p>
        <Badge variant="accent">{dict.practice.quizPrompt}</Badge>

        <div className="grid w-full max-w-md gap-3">
          {options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => choose(index)}
              disabled={chosen !== null}
              className={cn(
                'flex items-center justify-center rounded-xl border border-border p-3 transition-colors hover:bg-muted',
                chosen !== null && index === correctIndex && 'border-success bg-success/10',
                chosen === index && index !== correctIndex && 'border-danger bg-danger/10',
              )}
            >
              <KeyCombo keys={option.keys} />
            </button>
          ))}
        </div>

        {chosen !== null && (
          <div className="flex flex-col items-center gap-3">
            {chosen === correctIndex ? (
              <Badge variant="success" className="px-4 py-1.5 text-sm">
                <Check className="size-4" /> {dict.practice.correctLabel}
              </Badge>
            ) : (
              <Badge variant="danger" className="px-4 py-1.5 text-sm">
                <X className="size-4" /> {dict.practice.wrongLabel}
              </Badge>
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

/** The correct answer plus three same-domain distractors, deterministic order by id. */
function buildOptions(shortcut: ShortcutDefinition): ShortcutDefinition[] {
  const domainSlug = shortcut.id.split('.')[0];
  const pool = (registry.getDomain(domainSlug)?.shortcuts ?? []).filter(
    (s) => s.id !== shortcut.id && !sequencesEqual(s.keys, shortcut.keys),
  );
  // Deterministic pseudo-shuffle seeded by the shortcut id keeps tests stable
  // while different shortcuts still get different distractors.
  const seed = [...shortcut.id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const distractors = [...pool]
    .sort((a, b) => hash(a.id, seed) - hash(b.id, seed))
    .slice(0, 3);
  return [shortcut, ...distractors].sort((a, b) => hash(a.id, seed) - hash(b.id, seed));
}

function hash(text: string, seed: number): number {
  let h = seed;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 100_000;
  return h;
}
