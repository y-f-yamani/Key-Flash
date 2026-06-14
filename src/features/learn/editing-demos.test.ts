import { describe, expect, it } from 'vitest';
import { editingDemoFor } from './editing-demos';

describe('editingDemoFor', () => {
  it('maps the clipboard + editing essentials to a bespoke demo', () => {
    expect(editingDemoFor('win11.ctrl-c')).toBe('copy');
    expect(editingDemoFor('win11.ctrl-x')).toBe('cut');
    expect(editingDemoFor('win11.ctrl-v')).toBe('paste');
    expect(editingDemoFor('win11.ctrl-a')).toBe('selectAll');
    expect(editingDemoFor('win11.ctrl-z')).toBe('undo');
    expect(editingDemoFor('win11.ctrl-s')).toBe('save');
  });

  it('returns null for shortcuts without an editing demo', () => {
    expect(editingDemoFor('win11.win-e')).toBeNull();
    expect(editingDemoFor('win11.unknown')).toBeNull();
  });
});
