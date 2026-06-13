import { describe, expect, it } from 'vitest';
import { isPrivateMode, queueMode } from './match-service';

describe('queueMode', () => {
  it('maps public queues to the plain mode', () => {
    expect(queueMode('shortcut', false)).toBe('duel');
    expect(queueMode('typing', false)).toBe('typing');
  });

  it('suffixes private rooms so random matchmaking never finds them', () => {
    expect(queueMode('shortcut', true)).toBe('duel-private');
    expect(queueMode('typing', true)).toBe('typing-private');
    // A random join filters by the public mode, which excludes these.
    expect(queueMode('shortcut', true)).not.toBe(queueMode('shortcut', false));
  });
});

describe('isPrivateMode', () => {
  it('recognizes private room modes only', () => {
    expect(isPrivateMode('duel-private')).toBe(true);
    expect(isPrivateMode('typing-private')).toBe(true);
    expect(isPrivateMode('duel')).toBe(false);
    expect(isPrivateMode('typing')).toBe(false);
  });
});
