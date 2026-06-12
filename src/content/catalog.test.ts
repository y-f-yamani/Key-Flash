import { describe, expect, it } from 'vitest';
import { buildLessons, validateDomain } from '@/core/content';
import { lessonsFor, registry } from './index';
import { windows11 } from './domains/windows-11';

/**
 * Content gate: a broken catalog (missing translation, bad key, dangling
 * reference) fails CI here instead of reaching users. See ADR-0002.
 */
describe('windows-11 catalog', () => {
  it('passes structural validation', () => {
    expect(validateDomain(windows11)).toEqual([]);
  });

  it('has a substantial catalog across all categories', () => {
    expect(windows11.shortcuts.length).toBeGreaterThanOrEqual(60);
    for (const category of windows11.categories) {
      const inCategory = windows11.shortcuts.filter((s) => s.categoryId === category.id);
      expect(inCategory.length, `category ${category.id}`).toBeGreaterThan(0);
    }
  });

  it('every lesson references existing shortcuts', () => {
    for (const lesson of lessonsFor('win11')) {
      for (const id of lesson.shortcutIds) {
        expect(registry.getShortcut(id), `lesson ${lesson.id} → ${id}`).toBeDefined();
      }
    }
  });

  it('lesson derivation is deterministic', () => {
    expect(buildLessons(windows11)).toEqual(buildLessons(windows11));
  });

  it('speed modes have a usable pool (capturable shortcuts exist)', () => {
    const capturable = windows11.shortcuts.filter((s) => s.capturable !== 'none');
    expect(capturable.length).toBeGreaterThanOrEqual(40);
  });
});
