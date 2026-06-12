import { describe, expect, it } from 'vitest';
import { XP_REWARDS } from '@/core/gamification';
import type { SprintResult } from '@/core/scoring';
import { applyDrill, applySprintResult, dueShortcutIds, mastery } from './state';
import { INITIAL_PLAYER_STATE } from './types';

const NOW = 1_760_000_000_000;
const TODAY = '2026-06-11';

describe('applyDrill', () => {
  it('creates a card, awards XP, starts streak and daily XP on a correct drill', () => {
    const state = applyDrill(
      INITIAL_PLAYER_STATE,
      { shortcutId: 'win11.ctrl-c', correct: true, reactionMs: 400 },
      1,
      NOW,
      TODAY,
    );
    expect(state.cards['win11.ctrl-c']).toMatchObject({ attempts: 1, correct: 1, bestMs: 400 });
    expect(state.totalXp).toBe(XP_REWARDS.drillCorrectFast); // 400ms on difficulty 1 = easy
    expect(state.streak.current).toBe(1);
    expect(state.today).toEqual({ dateKey: TODAY, xp: XP_REWARDS.drillCorrectFast });
  });

  it('awards no XP for a wrong drill but still tracks the attempt', () => {
    const state = applyDrill(
      INITIAL_PLAYER_STATE,
      { shortcutId: 'win11.ctrl-c', correct: false, reactionMs: 800 },
      1,
      NOW,
      TODAY,
    );
    expect(state.totalXp).toBe(0);
    expect(state.cards['win11.ctrl-c']).toMatchObject({ attempts: 1, correct: 0, bestMs: null });
  });

  it('tracks best and average reaction across drills', () => {
    let state = INITIAL_PLAYER_STATE;
    state = applyDrill(state, { shortcutId: 'x', correct: true, reactionMs: 600 }, 1, NOW, TODAY);
    state = applyDrill(state, { shortcutId: 'x', correct: true, reactionMs: 400 }, 1, NOW, TODAY);
    expect(state.cards['x'].bestMs).toBe(400);
    expect(state.cards['x'].avgMs).toBe(500);
  });

  it('daily XP resets when the date key changes', () => {
    let state = applyDrill(
      INITIAL_PLAYER_STATE,
      { shortcutId: 'x', correct: true, reactionMs: 400 },
      1,
      NOW,
      '2026-06-11',
    );
    state = applyDrill(state, { shortcutId: 'x', correct: true, reactionMs: 400 }, 1, NOW, '2026-06-12');
    expect(state.today.dateKey).toBe('2026-06-12');
    expect(state.today.xp).toBe(XP_REWARDS.drillCorrectFast);
    expect(state.streak.current).toBe(2);
  });
});

describe('dueShortcutIds', () => {
  it('returns due cards oldest first', () => {
    let state = INITIAL_PLAYER_STATE;
    // A correct review schedules the card into the future; a failed one keeps it near.
    state = applyDrill(state, { shortcutId: 'a', correct: false, reactionMs: 500 }, 1, NOW, TODAY);
    state = applyDrill(state, { shortcutId: 'b', correct: true, reactionMs: 400 }, 1, NOW, TODAY);

    const dueSoon = dueShortcutIds(state, NOW + 15 * 60 * 1000); // +15 min
    expect(dueSoon).toEqual(['a']);

    const dueTomorrow = dueShortcutIds(state, NOW + 26 * 60 * 60 * 1000);
    expect(dueTomorrow).toEqual(['a', 'b']);
  });
});

describe('mastery', () => {
  it('is 0 for unseen shortcuts and grows with SRS intervals', () => {
    expect(mastery(INITIAL_PLAYER_STATE, ['a', 'b'])).toBe(0);
    let state = INITIAL_PLAYER_STATE;
    state = applyDrill(state, { shortcutId: 'a', correct: true, reactionMs: 400 }, 1, NOW, TODAY);
    const after = mastery(state, ['a', 'b']);
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(1);
  });
});

describe('applySprintResult', () => {
  const result: SprintResult = {
    score: 4200,
    accuracy: 0.9,
    avgReactionMs: 520,
    consistency: 0.8,
    maxCombo: 7,
    correct: 18,
    total: 20,
  };

  it('records a first run as a personal best and awards score-scaled XP', () => {
    const { state, isRecord, xpEarned } = applySprintResult(
      INITIAL_PLAYER_STATE,
      'sprint',
      result,
      NOW,
      TODAY,
    );
    expect(isRecord).toBe(true);
    expect(xpEarned).toBe(XP_REWARDS.sprintRun + 42);
    expect(state.bests['sprint']).toMatchObject({ score: 4200, achievedAt: NOW });
  });

  it('keeps the higher score as the record', () => {
    const first = applySprintResult(INITIAL_PLAYER_STATE, 'sprint', result, NOW, TODAY);
    const worse = applySprintResult(
      first.state,
      'sprint',
      { ...result, score: 1000 },
      NOW + 1,
      TODAY,
    );
    expect(worse.isRecord).toBe(false);
    expect(worse.state.bests['sprint'].score).toBe(4200);
  });
});
