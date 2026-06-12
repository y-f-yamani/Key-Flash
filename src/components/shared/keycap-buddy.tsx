import { cn } from '@/lib/utils';

export type BuddyMood = 'happy' | 'cheer' | 'focus' | 'zen';

interface KeycapBuddyProps {
  mood?: BuddyMood;
  /** Pixel size (square). */
  size?: number;
  className?: string;
}

/**
 * KeycapBuddy — the platform mascot: a keycap with a face. Pure SVG, themed
 * through CSS variables so it adapts to light/dark automatically.
 *
 * Moods: happy (default smile) · cheer (arms up + sparkles, for wins) ·
 * focus (game face, for drills) · zen (eyes closed, for "all caught up").
 */
export function KeycapBuddy({ mood = 'happy', size = 96, className }: KeycapBuddyProps) {
  return (
    <svg
      viewBox="0 0 140 140"
      width={size}
      height={size}
      role="img"
      aria-hidden
      data-testid="keycap-buddy"
      data-mood={mood}
      className={cn('drop-shadow-sm', className)}
    >
      {/* antenna */}
      <line x1="70" y1="22" x2="70" y2="34" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="70" cy="16" r="7" fill="var(--primary)" />

      {/* arms */}
      {mood === 'cheer' ? (
        <>
          <line x1="24" y1="78" x2="8" y2="56" stroke="var(--muted-foreground)" strokeWidth="6" strokeLinecap="round" />
          <line x1="116" y1="78" x2="132" y2="56" stroke="var(--muted-foreground)" strokeWidth="6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <line x1="24" y1="84" x2="12" y2="100" stroke="var(--muted-foreground)" strokeWidth="6" strokeLinecap="round" />
          <line x1="116" y1="84" x2="128" y2="100" stroke="var(--muted-foreground)" strokeWidth="6" strokeLinecap="round" />
        </>
      )}

      {/* feet */}
      <rect x="44" y="116" width="18" height="10" rx="5" fill="var(--muted-foreground)" />
      <rect x="78" y="116" width="18" height="10" rx="5" fill="var(--muted-foreground)" />

      {/* keycap body: side wall + top face for the 3D keycap look */}
      <rect x="22" y="38" width="96" height="82" rx="16" fill="var(--keycap-shadow)" />
      <rect
        x="22"
        y="34"
        width="96"
        height="76"
        rx="16"
        fill="var(--keycap-top)"
        stroke="var(--border)"
        strokeWidth="2.5"
      />

      {/* eyes */}
      {mood === 'zen' ? (
        <>
          <path d="M48 70 q6 6 12 0" stroke="var(--foreground)" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M80 70 q6 6 12 0" stroke="var(--foreground)" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="54" cy="68" r="6" fill="var(--foreground)" />
          <circle cx="86" cy="68" r="6" fill="var(--foreground)" />
          <circle cx="56" cy="66" r="2" fill="var(--keycap-top)" />
          <circle cx="88" cy="66" r="2" fill="var(--keycap-top)" />
        </>
      )}

      {/* brows for the game face */}
      {mood === 'focus' && (
        <>
          <line x1="46" y1="56" x2="60" y2="60" stroke="var(--foreground)" strokeWidth="4" strokeLinecap="round" />
          <line x1="94" y1="56" x2="80" y2="60" stroke="var(--foreground)" strokeWidth="4" strokeLinecap="round" />
        </>
      )}

      {/* mouth */}
      {mood === 'cheer' && (
        <path d="M56 84 q14 14 28 0 z" fill="var(--primary)" opacity="0.85" />
      )}
      {mood === 'happy' && (
        <path d="M56 86 q14 10 28 0" stroke="var(--foreground)" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      {mood === 'zen' && (
        <path d="M60 88 q10 6 20 0" stroke="var(--foreground)" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      {mood === 'focus' && (
        <line x1="58" y1="88" x2="82" y2="88" stroke="var(--foreground)" strokeWidth="4" strokeLinecap="round" />
      )}

      {/* blush */}
      {(mood === 'happy' || mood === 'cheer') && (
        <>
          <circle cx="40" cy="82" r="5" fill="var(--accent)" opacity="0.35" />
          <circle cx="100" cy="82" r="5" fill="var(--accent)" opacity="0.35" />
        </>
      )}

      {/* victory sparkles */}
      {mood === 'cheer' && (
        <g fill="var(--warning)">
          <path d="M18 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" />
          <path d="M122 24 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 z" />
          <path d="M126 96 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
        </g>
      )}
    </svg>
  );
}
