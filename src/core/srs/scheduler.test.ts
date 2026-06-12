import { describe, expect, it } from 'vitest';
import { MIN_EASE, gradeFromDrill, isDue, newCardState, review } from './scheduler';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 1_760_000_000_000;

describe('review', () => {
  it('new card graded good: 1 day, then 3 days, then multiplies by ease', () => {
    let card = newCardState(NOW);
    card = review(card, 'good', NOW);
    expect(card.intervalDays).toBe(1);
    expect(card.dueAt).toBe(NOW + DAY_MS);

    card = review(card, 'good', NOW + DAY_MS);
    expect(card.intervalDays).toBe(3);

    card = review(card, 'good', NOW + 4 * DAY_MS);
    expect(card.intervalDays).toBe(Math.round(3 * 2.5));
  });

  it('lapse resets interval, schedules relearn within the session, counts the lapse', () => {
    let card = newCardState(NOW);
    card = review(card, 'good', NOW);
    card = review(card, 'good', NOW);
    card = review(card, 'again', NOW);

    expect(card.intervalDays).toBe(0);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(1);
    expect(card.dueAt - NOW).toBeLessThan(DAY_MS); // due again soon, not tomorrow
  });

  it('ease never drops below the floor', () => {
    let card = newCardState(NOW);
    for (let i = 0; i < 20; i++) card = review(card, 'again', NOW);
    expect(card.ease).toBeGreaterThanOrEqual(MIN_EASE);
  });

  it('easy grows ease and interval faster than good', () => {
    let easyCard = newCardState(NOW);
    let goodCard = newCardState(NOW);
    for (let i = 0; i < 4; i++) {
      easyCard = review(easyCard, 'easy', NOW);
      goodCard = review(goodCard, 'good', NOW);
    }
    expect(easyCard.intervalDays).toBeGreaterThan(goodCard.intervalDays);
    expect(easyCard.ease).toBeGreaterThan(goodCard.ease);
  });

  it('hard still makes forward progress on mature cards', () => {
    let card = newCardState(NOW);
    card = review(card, 'good', NOW);
    card = review(card, 'good', NOW);
    const before = card.intervalDays;
    card = review(card, 'hard', NOW);
    expect(card.intervalDays).toBeGreaterThan(before);
  });
});

describe('isDue', () => {
  it('cards become due when dueAt passes', () => {
    const card = review(newCardState(NOW), 'good', NOW);
    expect(isDue(card, NOW)).toBe(false);
    expect(isDue(card, NOW + DAY_MS)).toBe(true);
  });
});

describe('gradeFromDrill', () => {
  it('wrong answers always grade again', () => {
    expect(gradeFromDrill({ correct: false, reactionMs: 100, difficulty: 1 })).toBe('again');
  });

  it('grades by speed', () => {
    expect(gradeFromDrill({ correct: true, reactionMs: 500, difficulty: 1 })).toBe('easy');
    expect(gradeFromDrill({ correct: true, reactionMs: 2000, difficulty: 1 })).toBe('good');
    expect(gradeFromDrill({ correct: true, reactionMs: 9000, difficulty: 1 })).toBe('hard');
  });

  it('harder shortcuts get more generous thresholds', () => {
    // 1400 ms is too slow for "easy" on difficulty 1 but fast enough on difficulty 5.
    expect(gradeFromDrill({ correct: true, reactionMs: 1400, difficulty: 1 })).toBe('good');
    expect(gradeFromDrill({ correct: true, reactionMs: 1400, difficulty: 5 })).toBe('easy');
  });
});
