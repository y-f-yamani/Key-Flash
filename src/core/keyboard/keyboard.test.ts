import { describe, expect, it } from 'vitest';
import { chordFromEvent, chordsEqual, parseChord, parseSequence } from './chord';
import { formatChord, keyLabel } from './format';
import { ShortcutMatcher } from './matcher';
import type { KeyEventLike } from './types';

function event(overrides: Partial<KeyEventLike> & { code: string }): KeyEventLike {
  return {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    repeat: false,
    ...overrides,
  };
}

describe('parseChord', () => {
  it.each([
    ['Ctrl+C', ['ctrl'], 'KeyC'],
    ['Win+Shift+S', ['shift', 'meta'], 'KeyS'],
    ['Win+.', ['meta'], 'Period'],
    ['Alt+Tab', ['alt'], 'Tab'],
    ['Win+1', ['meta'], 'Digit1'],
    ['Win+Up', ['meta'], 'ArrowUp'],
    ['F2', [], 'F2'],
    ['Shift+F10', ['shift'], 'F10'],
    ['Ctrl+Alt+Delete', ['ctrl', 'alt'], 'Delete'],
    ['Win+Plus', ['meta'], 'Equal'],
  ])('parses "%s"', (text, modifiers, code) => {
    const chord = parseChord(text);
    expect(chord.code).toBe(code);
    expect([...chord.modifiers].sort()).toEqual([...modifiers].sort());
  });

  it('rejects malformed chords', () => {
    expect(() => parseChord('Ctrl+')).toThrow();
    expect(() => parseChord('Ctrl+Ctrl+C')).toThrow();
    expect(() => parseChord('Ctrl+C+V')).toThrow();
    expect(() => parseChord('NotAKey')).toThrow();
  });
});

describe('chordFromEvent', () => {
  it('builds a chord from a modified keypress', () => {
    const chord = chordFromEvent(event({ code: 'KeyE', metaKey: true }));
    expect(chord).toEqual({ modifiers: ['meta'], code: 'KeyE' });
  });

  it('ignores modifier-only presses and repeats', () => {
    expect(chordFromEvent(event({ code: 'ControlLeft', ctrlKey: true }))).toBeNull();
    expect(chordFromEvent(event({ code: 'KeyC', ctrlKey: true, repeat: true }))).toBeNull();
  });
});

describe('chordsEqual', () => {
  it('is modifier-order independent', () => {
    expect(
      chordsEqual(
        { modifiers: ['ctrl', 'shift'], code: 'KeyS' },
        { modifiers: ['shift', 'ctrl'], code: 'KeyS' },
      ),
    ).toBe(true);
  });

  it('rejects extra or missing modifiers', () => {
    expect(
      chordsEqual({ modifiers: ['ctrl'], code: 'KeyS' }, { modifiers: [], code: 'KeyS' }),
    ).toBe(false);
  });
});

describe('ShortcutMatcher', () => {
  it('matches a single chord', () => {
    const matcher = new ShortcutMatcher([parseChord('Ctrl+C')]);
    const outcome = matcher.handleEvent(event({ code: 'KeyC', ctrlKey: true }));
    expect(outcome.kind).toBe('matched');
  });

  it('fails on the wrong key and reports what was pressed', () => {
    const matcher = new ShortcutMatcher([parseChord('Ctrl+C')]);
    const outcome = matcher.handleEvent(event({ code: 'KeyV', ctrlKey: true }));
    expect(outcome).toMatchObject({ kind: 'failed', pressed: { code: 'KeyV' } });
  });

  it('fails on extra modifiers', () => {
    const matcher = new ShortcutMatcher([parseChord('Ctrl+C')]);
    const outcome = matcher.handleEvent(event({ code: 'KeyC', ctrlKey: true, shiftKey: true }));
    expect(outcome.kind).toBe('failed');
  });

  it('walks multi-chord sequences and resets after completion', () => {
    const matcher = new ShortcutMatcher(parseSequence('Win+X', 'U'));
    expect(matcher.handleEvent(event({ code: 'KeyX', metaKey: true }))).toMatchObject({
      kind: 'progress',
      stepIndex: 1,
    });
    expect(matcher.handleEvent(event({ code: 'KeyU' })).kind).toBe('matched');
    // Sequence restarts cleanly after a match.
    expect(matcher.progress).toBe(0);
  });

  it('resets a sequence on a wrong chord', () => {
    const matcher = new ShortcutMatcher(parseSequence('Win+X', 'U'));
    matcher.handleEvent(event({ code: 'KeyX', metaKey: true }));
    expect(matcher.handleEvent(event({ code: 'KeyZ' })).kind).toBe('failed');
    expect(matcher.progress).toBe(0);
  });

  it('accepts the meta remap in place of the Win key (ADR-0004)', () => {
    const matcher = new ShortcutMatcher([parseChord('Win+E')], { metaRemap: ['ctrl', 'alt'] });
    const outcome = matcher.handleEvent(event({ code: 'KeyE', ctrlKey: true, altKey: true }));
    expect(outcome.kind).toBe('matched');
  });

  it('still accepts the REAL Win key when a remap is configured (Keyboard Lock mode)', () => {
    const matcher = new ShortcutMatcher([parseChord('Win+E')], { metaRemap: ['ctrl', 'alt'] });
    expect(matcher.handleEvent(event({ code: 'KeyE', metaKey: true })).kind).toBe('matched');
    // Real Win + extra modifiers still fails.
    expect(
      matcher.handleEvent(event({ code: 'KeyE', metaKey: true, shiftKey: true })).kind,
    ).toBe('failed');
  });

  it('remap preserves additional expected modifiers', () => {
    const matcher = new ShortcutMatcher([parseChord('Win+Shift+S')], {
      metaRemap: ['ctrl', 'alt'],
    });
    const wrong = matcher.handleEvent(event({ code: 'KeyS', ctrlKey: true, altKey: true }));
    expect(wrong.kind).toBe('failed');
    const right = matcher.handleEvent(
      event({ code: 'KeyS', ctrlKey: true, altKey: true, shiftKey: true }),
    );
    expect(right.kind).toBe('matched');
  });

  it('ignores modifier-only presses while holding a chord', () => {
    const matcher = new ShortcutMatcher([parseChord('Ctrl+Shift+Esc')]);
    expect(matcher.handleEvent(event({ code: 'ControlLeft', ctrlKey: true })).kind).toBe('ignored');
    expect(
      matcher.handleEvent(event({ code: 'ShiftLeft', ctrlKey: true, shiftKey: true })).kind,
    ).toBe('ignored');
    expect(
      matcher.handleEvent(event({ code: 'Escape', ctrlKey: true, shiftKey: true })).kind,
    ).toBe('matched');
  });
});

describe('format', () => {
  it('labels keys for display', () => {
    expect(keyLabel('KeyE')).toBe('E');
    expect(keyLabel('Digit1')).toBe('1');
    expect(keyLabel('ArrowUp')).toBe('↑');
  });

  it('formats chords', () => {
    expect(formatChord(parseChord('Win+Shift+S'))).toBe('Win + Shift + S');
  });
});
