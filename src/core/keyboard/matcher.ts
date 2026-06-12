import { chordFromEvent, chordsEqual, sortModifiers } from './chord';
import type { KeyChord, KeyEventLike, MatchOutcome, Modifier } from './types';

export interface MatcherOptions {
  /**
   * Practice stand-in for the Win/Meta key (ADR-0004). When set, an expected
   * `meta` modifier is satisfied by holding all of these modifiers instead.
   * Default: no remap — the real Meta key is required.
   */
  readonly metaRemap?: readonly Modifier[];
}

/**
 * Stateful matcher for one expected shortcut (a sequence of 1..n chords).
 *
 * Feed every keydown through `handleEvent`. Modifier-only presses and key
 * repeats are ignored; any complete chord either advances the sequence,
 * finishes it, or fails the attempt. The caller decides what failure means
 * (retry, mark incorrect, ...) — the matcher just reports.
 */
export class ShortcutMatcher {
  private stepIndex = 0;

  constructor(
    private readonly expected: readonly KeyChord[],
    private readonly options: MatcherOptions = {},
  ) {
    if (expected.length === 0) {
      throw new Error('ShortcutMatcher requires at least one chord');
    }
  }

  get progress(): number {
    return this.stepIndex;
  }

  reset(): void {
    this.stepIndex = 0;
  }

  handleEvent(event: KeyEventLike): MatchOutcome {
    const pressed = chordFromEvent(event);
    if (pressed === null) return { kind: 'ignored' };
    return this.handleChord(pressed);
  }

  handleChord(pressed: KeyChord): MatchOutcome {
    const expected = this.effectiveChord(this.expected[this.stepIndex]);
    if (chordsEqual(pressed, expected)) {
      this.stepIndex += 1;
      if (this.stepIndex >= this.expected.length) {
        this.stepIndex = 0;
        return { kind: 'matched' };
      }
      return { kind: 'progress', stepIndex: this.stepIndex };
    }
    this.stepIndex = 0;
    return { kind: 'failed', pressed };
  }

  /** Applies the meta remap to an expected chord, if configured. */
  private effectiveChord(chord: KeyChord): KeyChord {
    const remap = this.options.metaRemap;
    if (!remap || !chord.modifiers.includes('meta')) return chord;
    const modifiers = new Set<Modifier>(chord.modifiers.filter((m) => m !== 'meta'));
    for (const m of remap) modifiers.add(m);
    return { modifiers: sortModifiers([...modifiers]), code: chord.code };
  }
}
