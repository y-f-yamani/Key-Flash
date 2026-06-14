'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, GraduationCap, Keyboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { KeyCombo } from '@/components/shared/key-combo';
import { KeyboardView } from '@/components/shared/keyboard-view';
import type { ShortcutDefinition } from '@/core/content';
import { ExpandableScreen } from '@/features/simulator/expandable-screen';
import { useI18n } from '@/lib/i18n/provider';
import { ShortcutEffect } from '@/features/simulator/shortcut-effect';

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
  const [showKeyboard, setShowKeyboard] = useState(false);
  const shortcut = shortcuts[index];
  const isLast = index >= shortcuts.length - 1;

  return (
    <Card data-testid="lesson-teach">
      <CardContent className="flex flex-col gap-2 p-3 sm:p-4">
        {/* compact header */}
        <div className="flex flex-col items-center gap-1 text-center">
          <Badge variant="accent">
            <GraduationCap className="size-3.5" /> {dict.learn.learnBadge}
          </Badge>
          <h2 className="text-lg font-bold sm:text-xl">{shortcut.name[locale]}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">{shortcut.description[locale]}</p>
          <KeyCombo keys={shortcut.keys} />
        </div>

        {/* Big simulator (the focus), with a collapsible keyboard below so
            the lesson fits one screen by default; expand the keyboard to
            study the keys. */}
        <div className="flex w-full flex-col items-center gap-2">
          <div className="w-full max-w-2xl">
            <TeachPreview key={shortcut.id} shortcut={shortcut} />
          </div>

          {showKeyboard ? (
            <div className="flex w-full flex-col items-center gap-1.5">
              <KeyboardView keys={shortcut.keys} className="max-w-2xl" />
              <Button variant="ghost" size="sm" onClick={() => setShowKeyboard(false)}>
                <Keyboard className="size-3.5" /> {dict.learn.hideKeyboard}
                <ChevronUp className="size-3.5" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowKeyboard(true)}>
              <Keyboard className="size-3.5" /> {dict.learn.showKeyboard}
              <ChevronDown className="size-3.5" />
            </Button>
          )}
        </div>

        {/* compact footer */}
        <div className="flex flex-col items-center gap-1.5">
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
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The Windows 11 preview for one shortcut, auto-playing the effect once.
 * Mounted with a key per shortcut so it starts fresh; Replay re-arms.
 */
function TeachPreview({ shortcut }: { shortcut: ShortcutDefinition }) {
  const { locale, dict } = useI18n();
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

  return (
    <ExpandableScreen onReplay={replay} replayLabel={dict.learn.replay} expandLabel={dict.learn.expand}>
      <ShortcutEffect shortcut={shortcut} after={after} locale={locale} />
    </ExpandableScreen>
  );
}
