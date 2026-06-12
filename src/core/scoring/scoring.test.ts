import { describe, expect, it } from 'vitest';
import { SPRINT_RULES, pointsForAnswer, scoreSprint } from './sprint';
import { accuracy, consistency, maxCombo, meanReactionMs, type DrillEvent } from './stats';

function evt(correct: boolean, promptAt: number, reaction: number): DrillEvent {
  return { shortcutId: 'win11.test', promptAt, answeredAt: promptAt + reaction, correct };
}

describe('stats', () => {
  const events = [evt(true, 0, 400), evt(false, 1000, 900), evt(true, 2000, 600)];

  it('accuracy counts correct over total', () => {
    expect(accuracy(events)).toBeCloseTo(2 / 3);
    expect(accuracy([])).toBe(0);
  });

  it('mean reaction uses correct answers only', () => {
    expect(meanReactionMs(events)).toBe(500);
  });

  it('consistency is 1 for perfectly even pacing and lower for erratic pacing', () => {
    const even = [evt(true, 0, 500), evt(true, 1000, 500), evt(true, 2000, 500)];
    const erratic = [evt(true, 0, 200), evt(true, 1000, 1800), evt(true, 3000, 300)];
    expect(consistency(even)).toBe(1);
    expect(consistency(erratic)).toBeLessThan(consistency(even));
    expect(consistency(erratic)).toBeGreaterThanOrEqual(0);
  });

  it('handles degenerate inputs', () => {
    expect(consistency([])).toBe(0);
    expect(consistency([evt(true, 0, 500)])).toBe(1); // single answer: trivially steady
    expect(consistency([evt(false, 0, 500), evt(false, 1000, 600)])).toBe(0); // nothing correct
    expect(meanReactionMs([evt(false, 0, 500)])).toBe(0);
    expect(maxCombo([])).toBe(0);
  });

  it('maxCombo finds the longest correct run', () => {
    const run = [evt(true, 0, 1), evt(true, 1, 1), evt(false, 2, 1), evt(true, 3, 1)];
    expect(maxCombo(run)).toBe(2);
  });
});

describe('pointsForAnswer', () => {
  it('rewards speed up to the cap', () => {
    const fast = pointsForAnswer(SPRINT_RULES.fastestMs, 1);
    const slow = pointsForAnswer(SPRINT_RULES.slowestMs, 1);
    expect(fast).toBe(SPRINT_RULES.basePoints + SPRINT_RULES.maxSpeedBonus);
    expect(slow).toBe(SPRINT_RULES.basePoints);
  });

  it('combo multiplies and caps at 2x', () => {
    const single = pointsForAnswer(1000, 1);
    expect(pointsForAnswer(1000, 2)).toBeGreaterThan(single);
    expect(pointsForAnswer(1000, 100)).toBe(single * SPRINT_RULES.comboCap);
  });
});

describe('scoreSprint', () => {
  it('is deterministic: same timeline, same score (anti-cheat invariant)', () => {
    const timeline = [
      evt(true, 0, 350),
      evt(true, 800, 500),
      evt(false, 1500, 700),
      evt(true, 2400, 450),
    ];
    const a = scoreSprint(timeline);
    const b = scoreSprint([...timeline]);
    expect(a).toEqual(b);
  });

  it('a miss resets the combo multiplier', () => {
    const clean = scoreSprint([evt(true, 0, 500), evt(true, 1000, 500), evt(true, 2000, 500)]);
    const broken = scoreSprint([
      evt(true, 0, 500),
      evt(false, 1000, 500),
      evt(true, 2000, 500),
      evt(true, 3000, 500),
    ]);
    // Same number of correct answers at identical speed, but the broken run
    // restarts its combo, so it scores less.
    expect(broken.score).toBeLessThan(clean.score);
    expect(broken.maxCombo).toBe(2);
  });

  it('summarizes the run', () => {
    const result = scoreSprint([evt(true, 0, 400), evt(false, 1000, 600)]);
    expect(result.correct).toBe(1);
    expect(result.total).toBe(2);
    expect(result.accuracy).toBe(0.5);
    expect(result.avgReactionMs).toBe(400);
  });
});
