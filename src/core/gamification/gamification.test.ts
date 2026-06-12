import { describe, expect, it } from 'vitest';
import { EMPTY_STREAK, dateKeyInTimeZone, effectiveStreak, recordActivity } from './streak';
import { levelFromXp, levelProgress, totalXpForLevel } from './xp';

describe('xp curve', () => {
  it('is monotonically increasing', () => {
    for (let level = 1; level < 100; level++) {
      expect(totalXpForLevel(level + 1)).toBeGreaterThan(totalXpForLevel(level));
    }
  });

  it('level boundaries are exact', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(totalXpForLevel(2) - 1)).toBe(1);
    expect(levelFromXp(totalXpForLevel(2))).toBe(2);
    expect(levelFromXp(totalXpForLevel(10))).toBe(10);
  });

  it('levelProgress reports fraction toward the next level', () => {
    const halfway =
      totalXpForLevel(3) + Math.floor((totalXpForLevel(4) - totalXpForLevel(3)) / 2);
    const progress = levelProgress(halfway);
    expect(progress.level).toBe(3);
    expect(progress.fraction).toBeGreaterThan(0.4);
    expect(progress.fraction).toBeLessThan(0.6);
  });
});

describe('streak', () => {
  it('starts at 1 on first activity', () => {
    const streak = recordActivity(EMPTY_STREAK, '2026-06-11');
    expect(streak).toMatchObject({ current: 1, longest: 1 });
  });

  it('increments on consecutive days', () => {
    let streak = recordActivity(EMPTY_STREAK, '2026-06-10');
    streak = recordActivity(streak, '2026-06-11');
    expect(streak.current).toBe(2);
  });

  it('is idempotent within the same day', () => {
    let streak = recordActivity(EMPTY_STREAK, '2026-06-11');
    streak = recordActivity(streak, '2026-06-11');
    expect(streak.current).toBe(1);
  });

  it('resets after a gap day but keeps the longest record', () => {
    let streak = recordActivity(EMPTY_STREAK, '2026-06-09');
    streak = recordActivity(streak, '2026-06-10');
    streak = recordActivity(streak, '2026-06-12'); // skipped the 11th
    expect(streak).toMatchObject({ current: 1, longest: 2 });
  });

  it('handles month and year boundaries', () => {
    let streak = recordActivity(EMPTY_STREAK, '2025-12-31');
    streak = recordActivity(streak, '2026-01-01');
    expect(streak.current).toBe(2);
  });

  it('effectiveStreak shows 0 once a streak is already broken', () => {
    const streak = recordActivity(EMPTY_STREAK, '2026-06-08');
    expect(effectiveStreak(streak, '2026-06-09')).toBe(1); // yesterday — still alive
    expect(effectiveStreak(streak, '2026-06-10')).toBe(0); // gap — broken
  });
});

describe('dateKeyInTimeZone', () => {
  it('computes the calendar day in the given timezone', () => {
    // 2026-06-11T22:30:00Z is already June 12 in Riyadh (UTC+3).
    const instant = Date.UTC(2026, 5, 11, 22, 30);
    expect(dateKeyInTimeZone(instant, 'Asia/Riyadh')).toBe('2026-06-12');
    expect(dateKeyInTimeZone(instant, 'UTC')).toBe('2026-06-11');
  });
});
