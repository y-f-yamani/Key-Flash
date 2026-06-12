import { describe, expect, it } from 'vitest';
import { createRng, pickPrompt } from './rng';

describe('createRng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('different seeds diverge', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it('outputs stay in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('pickPrompt', () => {
  const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('never repeats the previous prompt', () => {
    const rng = createRng(123);
    let previous: string | null = null;
    for (let i = 0; i < 200; i++) {
      const next: { id: string } = pickPrompt(pool, rng, previous);
      expect(next.id).not.toBe(previous);
      previous = next.id;
    }
  });

  it('handles a single-item pool', () => {
    expect(pickPrompt([{ id: 'only' }], createRng(1), 'only').id).toBe('only');
  });

  it('throws on an empty pool', () => {
    expect(() => pickPrompt([], createRng(1), null)).toThrow();
  });
});
