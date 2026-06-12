import { describe, expect, it } from 'vitest';
import type { DrillEvent } from '../scoring';
import {
  MODES,
  TIME_ATTACK_RULES,
  getMode,
  isRunOver,
  livesLeft,
  scoreTimeAttack,
} from './modes';

function evt(correct: boolean, promptAt: number, reaction: number): DrillEvent {
  return { shortcutId: 'win11.x', promptAt, answeredAt: promptAt + reaction, correct };
}

describe('getMode', () => {
  it('resolves all six modes and rejects unknown ones', () => {
    expect(getMode('sprint')?.slug).toBe('sprint');
    expect(getMode('boss-rush')?.minDifficulty).toBe(3);
    expect(getMode('reaction')?.targetCount).toBe(15);
    expect(getMode('cheat-mode')).toBeUndefined();
  });
});

describe('isRunOver', () => {
  it('sprint ends on the clock only', () => {
    const sprint = MODES.sprint;
    const manyMisses = Array.from({ length: 10 }, (_, i) => evt(false, i * 100, 50));
    expect(isRunOver(sprint, manyMisses, 59_999)).toBe(false);
    expect(isRunOver(sprint, [], 60_000)).toBe(true);
  });

  it('survival ends after 3 misses, never on the clock', () => {
    const survival = MODES.survival;
    const twoMisses = [evt(false, 0, 100), evt(true, 200, 100), evt(false, 400, 100)];
    expect(isRunOver(survival, twoMisses, 10 * 60_000)).toBe(false);
    expect(isRunOver(survival, [...twoMisses, evt(false, 600, 100)], 0)).toBe(true);
  });

  it('combo-rush ends on the first miss', () => {
    const comboRush = MODES['combo-rush'];
    expect(isRunOver(comboRush, [evt(true, 0, 100)], 0)).toBe(false);
    expect(isRunOver(comboRush, [evt(true, 0, 100), evt(false, 200, 100)], 0)).toBe(true);
  });

  it('time-attack ends after the target count', () => {
    const timeAttack = MODES['time-attack'];
    const nineteen = Array.from({ length: 19 }, (_, i) => evt(true, i * 100, 50));
    expect(isRunOver(timeAttack, nineteen, 0)).toBe(false);
    expect(isRunOver(timeAttack, [...nineteen, evt(true, 2_000, 50)], 0)).toBe(true);
  });

  it('boss-rush ends on either lives or target', () => {
    const bossRush = MODES['boss-rush'];
    const threeMisses = [evt(false, 0, 100), evt(false, 200, 100), evt(false, 400, 100)];
    expect(isRunOver(bossRush, threeMisses, 0)).toBe(true);
    const fifteenHits = Array.from({ length: 15 }, (_, i) => evt(true, i * 100, 50));
    expect(isRunOver(bossRush, fifteenHits, 0)).toBe(true);
  });
});

describe('livesLeft', () => {
  it('counts down from maxMisses and floors at 0', () => {
    const survival = MODES.survival;
    expect(livesLeft(survival, [])).toBe(3);
    expect(livesLeft(survival, [evt(false, 0, 100), evt(true, 200, 100)])).toBe(2);
    expect(livesLeft(MODES.sprint, [evt(false, 0, 100)])).toBeNull();
  });
});

describe('scoreTimeAttack', () => {
  it('faster runs score higher; misses cost a fixed penalty', () => {
    const fast = Array.from({ length: 20 }, (_, i) => evt(true, i * 500, 400));
    const slow = Array.from({ length: 20 }, (_, i) => evt(true, i * 1_000, 900));
    expect(scoreTimeAttack(fast).score).toBeGreaterThan(scoreTimeAttack(slow).score);

    const withMiss = [...fast.slice(0, 19), evt(false, 19 * 500, 400)];
    expect(scoreTimeAttack(fast).score - scoreTimeAttack(withMiss).score).toBeGreaterThanOrEqual(
      TIME_ATTACK_RULES.missPenalty,
    );
  });

  it('is deterministic and floors at zero', () => {
    const crawl = [evt(true, 0, 400_000)];
    expect(scoreTimeAttack(crawl).score).toBe(0);
    const events = [evt(true, 0, 300), evt(false, 500, 200)];
    expect(scoreTimeAttack(events)).toEqual(scoreTimeAttack([...events]));
  });

  it('keeps the standard stat fields from the timeline', () => {
    const events = [evt(true, 0, 300), evt(false, 500, 200)];
    const result = scoreTimeAttack(events);
    expect(result.accuracy).toBe(0.5);
    expect(result.total).toBe(2);
  });
});
