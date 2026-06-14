'use client';

import { useState, type ReactNode } from 'react';
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Wraps a Windows-screen preview with Replay + Expand controls. Expanding
 * lifts the same subtree into a full-screen overlay (preserving its animation
 * state) so learners can study the simulator up close.
 */
export function ExpandableScreen({
  children,
  onReplay,
  replayLabel,
  expandLabel,
}: {
  children: ReactNode;
  onReplay?: () => void;
  replayLabel: string;
  expandLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'relative w-full',
        expanded && 'fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8',
      )}
    >
      <div className={cn('relative w-full', expanded && 'max-w-6xl')}>
        {children}
        <div className="absolute right-2 top-2 z-30 flex gap-1">
          {onReplay && (
            <button
              type="button"
              onClick={onReplay}
              title={replayLabel}
              aria-label={replayLabel}
              className="rounded-md bg-black/50 p-1.5 text-white backdrop-blur transition-colors hover:bg-black/70"
            >
              <RotateCcw className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            title={expandLabel}
            aria-label={expandLabel}
            data-testid="preview-expand"
            className="rounded-md bg-black/50 p-1.5 text-white backdrop-blur transition-colors hover:bg-black/70"
          >
            {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
