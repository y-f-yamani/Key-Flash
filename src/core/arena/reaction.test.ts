import { describe, expect, it } from 'vitest';
import type { DrillEvent } from '../scoring';
import { createRng } from './rng';
import { REACTION_RULES, averageReactionMs, roundDelayMs, scoreReaction } from './reaction';

function round(reactionMs: number, at = 0): DrillEvent {
  return { shortcutId: 'reaction', promptAt: at, answeredAt: at + reactionMs, correct: true };
}

function falseStart(at: number): DrillEvent {
  return { shortcutId: 'reaction', promptAt: at - 1, answeredAt: at, correct: false };
}

describe('roundDelayMs', () => {
  it('stays inside the configured window and is seed-deterministic', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const delay = roundDelayMs(rng);
      expect(delay).toBeGreaterThanOrEqual(REACTION_RULES.minDelayMs);
      expect(delay).toBeLessThanOrEqual(REACTION_RULES.maxDelayMs);
    }
    expect(roundDelayMs(createRng(42))).toBe(roundDelayMs(createRng(42)));
  });
});

describe('averageReactionMs', () => {
  it('averages clean rounds only', () => {
    const events = [round(200, 0), falseStart(1_000), round(300, 2_000)];
    expect(averageReactionMs(events)).toBe(250);
    expect(averageReactionMs([falseStart(10)])).toBe(0);
  });
});

describe('scoreReaction', () => {
  it('faster averages score higher', () => {
    const fast = [round(180, 0), round(200, 1_000)];
    const slow = [round(400, 0), round(450, 1_000)];
    expect(scoreReaction(fast).score).toBeGreaterThan(scoreReaction(slow).score);
  });

  it('false starts cost a flat penalty and lower accuracy', () => {
    const clean = [round(250, 0), round(250, 1_000)];
    const sloppy = [...clean, falseStart(2_000)];
    expect(scoreReaction(clean).score - scoreReaction(sloppy).score).toBe(
      REACTION_RULES.falseStartPenalty,
    );
    expect(scoreReaction(sloppy).accuracy).toBeCloseTo(2 / 3);
  });

  it('zero clean rounds scores zero; score never goes negative', () => {
    expect(scoreReaction([falseStart(0)]).score).toBe(0);
    const glacial = [round(5_000, 0)];
    expect(scoreReaction(glacial).score).toBe(0);
  });

  it('is deterministic (anti-cheat invariant)', () => {
    const timeline = [round(222, 0), falseStart(1_500), round(333, 3_000)];
    expect(scoreReaction(timeline)).toEqual(scoreReaction([...timeline]));
  });
});
