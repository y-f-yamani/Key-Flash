/**
 * Daily streaks. Day boundaries are the *user's* calendar days, so all
 * functions operate on "YYYY-MM-DD" date keys computed in the user's timezone
 * by the caller (see `dateKeyInTimeZone`). Core stays clock- and tz-agnostic.
 */

export interface StreakState {
  readonly current: number;
  readonly longest: number;
  /** Date key of the last day that counted, or null for new users. */
  readonly lastActiveDate: string | null;
}

export const EMPTY_STREAK: StreakState = { current: 0, longest: 0, lastActiveDate: null };

/** Records activity on `dateKey` and returns the updated streak. Idempotent per day. */
export function recordActivity(state: StreakState, dateKey: string): StreakState {
  if (state.lastActiveDate === dateKey) return state;

  const current = state.lastActiveDate === previousDateKey(dateKey) ? state.current + 1 : 1;
  return {
    current,
    longest: Math.max(state.longest, current),
    lastActiveDate: dateKey,
  };
}

/**
 * The streak shown to the user: a streak whose last activity was before
 * yesterday is already broken even though no new activity has been recorded.
 */
export function effectiveStreak(state: StreakState, todayKey: string): number {
  if (state.lastActiveDate === null) return 0;
  if (state.lastActiveDate === todayKey || state.lastActiveDate === previousDateKey(todayKey)) {
    return state.current;
  }
  return 0;
}

/** "YYYY-MM-DD" for an instant in a specific IANA timezone. */
export function dateKeyInTimeZone(epochMs: number, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD; Intl handles DST and offsets correctly.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(epochMs));
}

function previousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
