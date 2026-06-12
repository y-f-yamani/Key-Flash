import { Fragment } from 'react';
import { chordLabels, type KeyChord } from '@/core/keyboard';
import { cn } from '@/lib/utils';

interface KeyComboProps {
  keys: readonly KeyChord[];
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * Renders a chord sequence as physical keycaps: [Win] + [Shift] + [S].
 * Sequences render with an arrow between steps: [Win]+[X] → [U].
 * dir="ltr" because key combos read left-to-right even in RTL locales.
 */
export function KeyCombo({ keys, size = 'md', className }: KeyComboProps) {
  return (
    <span dir="ltr" className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      {keys.map((chord, chordIndex) => (
        <Fragment key={chordIndex}>
          {chordIndex > 0 && <span className="mx-1 text-muted-foreground">→</span>}
          {chordLabels(chord).map((label, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="text-muted-foreground">+</span>}
              <kbd className={cn('keycap', size === 'lg' && 'min-w-12 px-3 py-2 text-lg')}>
                {label}
              </kbd>
            </Fragment>
          ))}
        </Fragment>
      ))}
    </span>
  );
}
