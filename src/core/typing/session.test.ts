import { describe, expect, it } from 'vitest';
import { applyKey, createSession, extendTarget, sessionStats } from './session';

const T0 = 1_000_000;

function type(text: string, target = 'the quick fox', gapMs = 100) {
  let session = createSession(target);
  let at = T0;
  for (const ch of text) {
    session = applyKey(session, ch, at);
    at += gapMs;
  }
  return session;
}

describe('applyKey', () => {
  it('advances on correct chars and records the streak', () => {
    const session = type('the');
    expect(session.position).toBe(3);
    expect(session.correctKeystrokes).toBe(3);
    expect(session.bestStreak).toBe(3);
    expect(session.chars.every((c) => c.correct)).toBe(true);
  });

  it('records wrong chars in place and resets the streak', () => {
    const session = type('thx');
    expect(session.position).toBe(3);
    expect(session.chars[2]).toMatchObject({ expected: 'e', typed: 'x', correct: false });
    expect(session.currentStreak).toBe(0);
    expect(session.bestStreak).toBe(2);
  });

  it('Backspace pops the caret but never erases the error from accuracy', () => {
    let session = type('thx');
    session = applyKey(session, 'Backspace', T0 + 400);
    expect(session.position).toBe(2);
    session = applyKey(session, 'e', T0 + 500);
    expect(session.chars[2].correct).toBe(true);
    // 4 char keystrokes total, 3 correct — the fixed mistake still counts.
    expect(session.keystrokes).toBe(4);
    expect(session.correctKeystrokes).toBe(3);
  });

  it('Backspace at position 0 and typing past the end are no-ops', () => {
    const empty = createSession('ab');
    expect(applyKey(empty, 'Backspace', T0)).toBe(empty);
    const done = type('ab', 'ab');
    expect(applyKey(done, 'c', T0 + 999).position).toBe(2);
  });

  it('ignores multi-character keys (modifiers, arrows)', () => {
    const session = applyKey(createSession('abc'), 'Shift', T0);
    expect(session.keystrokes).toBe(0);
  });

  it('extendTarget appends text without disturbing progress', () => {
    const session = extendTarget(type('the', 'the'), ' end');
    expect(session.target).toBe('the end');
    expect(session.position).toBe(3);
  });
});

describe('sessionStats', () => {
  it('computes net and gross WPM from the standard 5-char word', () => {
    // 25 correct chars in exactly 60s = 5 words/min.
    const target = 'a'.repeat(25);
    let session = createSession(target);
    for (let i = 0; i < 25; i++) {
      session = applyKey(session, 'a', T0 + (i * 60_000) / 24);
    }
    const stats = sessionStats(session, T0 + 60_000);
    expect(stats.netWpm).toBeCloseTo(5, 5);
    expect(stats.grossWpm).toBeCloseTo(5, 5);
  });

  it('wrong chars lower net WPM but not gross WPM', () => {
    const session = type('txe quick', 'the quick');
    const stats = sessionStats(session, T0 + 9 * 100);
    expect(stats.grossWpm).toBeGreaterThan(stats.netWpm);
    expect(stats.accuracy).toBeCloseTo(8 / 9);
  });

  it('steady rhythm scores consistency 1; erratic rhythm scores lower', () => {
    const steady = type('the quick', 'the quick', 100);
    expect(sessionStats(steady, T0 + 1_000).consistency).toBe(1);

    let erratic = createSession('the quick');
    const gaps = [50, 900, 60, 800, 70, 700, 80, 600];
    let at = T0;
    'the quick'.split('').forEach((ch, i) => {
      erratic = applyKey(erratic, ch, at);
      at += gaps[i % gaps.length];
    });
    expect(sessionStats(erratic, at).consistency).toBeLessThan(0.6);
  });

  it('empty session yields zeroed stats', () => {
    const stats = sessionStats(createSession('abc'), T0);
    expect(stats).toMatchObject({ netWpm: 0, grossWpm: 0, accuracy: 0, elapsedMs: 0 });
  });
});
