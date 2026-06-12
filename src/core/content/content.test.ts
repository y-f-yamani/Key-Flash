import { describe, expect, it } from 'vitest';
import { parseChord } from '../keyboard';
import { DomainRegistry, buildLessons } from './registry';
import type { ShortcutDefinition, ShortcutDomain } from './types';
import { validateDomain } from './validate';

function shortcut(overrides: Partial<ShortcutDefinition> & { id: string }): ShortcutDefinition {
  return {
    keys: [parseChord('Ctrl+C')],
    name: { en: 'Name', ar: 'اسم' },
    description: { en: 'Desc', ar: 'وصف' },
    categoryId: 'cat',
    difficulty: 1,
    capturable: 'full',
    ...overrides,
  };
}

function domain(overrides: Partial<ShortcutDomain>): ShortcutDomain {
  return {
    slug: 'demo',
    name: { en: 'Demo', ar: 'تجريبي' },
    version: '1.0.0',
    categories: [
      {
        id: 'cat',
        order: 1,
        name: { en: 'Cat', ar: 'فئة' },
        description: { en: 'D', ar: 'و' },
      },
    ],
    shortcuts: [shortcut({ id: 'demo.a' })],
    ...overrides,
  };
}

describe('validateDomain', () => {
  it('accepts a well-formed domain', () => {
    expect(validateDomain(domain({}))).toEqual([]);
  });

  it('reports every structural problem, not just the first', () => {
    const bad = domain({
      slug: 'Bad Slug',
      categories: [],
      shortcuts: [
        shortcut({ id: 'other.x' }), // wrong prefix
        shortcut({ id: 'Bad Slug.dup', categoryId: 'missing' }),
        shortcut({ id: 'Bad Slug.dup', keys: [] }), // duplicate + empty keys
        shortcut({
          id: 'Bad Slug.empty',
          name: { en: '', ar: 'اسم' },
          description: { en: 'ok', ar: ' ' },
        }),
      ],
    });
    const problems = validateDomain(bad);
    expect(problems.join('\n')).toContain('kebab-case');
    expect(problems.join('\n')).toContain('no categories');
    expect(problems.join('\n')).toContain('must be prefixed');
    expect(problems.join('\n')).toContain('duplicate id');
    expect(problems.join('\n')).toContain('unknown category');
    expect(problems.join('\n')).toContain('empty key sequence');
    expect(problems.join('\n')).toContain('missing en name');
    expect(problems.join('\n')).toContain('missing ar description');
  });
});

describe('DomainRegistry', () => {
  it('indexes domains and shortcuts', () => {
    const registry = new DomainRegistry([domain({})]);
    expect(registry.listDomains()).toHaveLength(1);
    expect(registry.getDomain('demo')?.slug).toBe('demo');
    expect(registry.getDomain('nope')).toBeUndefined();
    expect(registry.getShortcut('demo.a')?.id).toBe('demo.a');
    expect(registry.getShortcut('demo.zzz')).toBeUndefined();
    expect(registry.shortcutsInCategory('demo', 'cat')).toHaveLength(1);
    expect(registry.shortcutsInCategory('nope', 'cat')).toEqual([]);
  });

  it('rejects duplicate domain slugs and shortcut ids at construction', () => {
    expect(() => new DomainRegistry([domain({}), domain({})])).toThrow(/Duplicate domain/);
    expect(
      () =>
        new DomainRegistry([
          domain({ shortcuts: [shortcut({ id: 'demo.a' }), shortcut({ id: 'demo.a' })] }),
        ]),
    ).toThrow(/Duplicate shortcut/);
  });
});

describe('buildLessons', () => {
  it('chunks categories into lessons of at most 5 in catalog order', () => {
    const shortcuts = Array.from({ length: 7 }, (_, i) => shortcut({ id: `demo.s${i}` }));
    const lessons = buildLessons(domain({ shortcuts }));
    expect(lessons).toHaveLength(2);
    expect(lessons[0].shortcutIds).toHaveLength(5);
    expect(lessons[1].shortcutIds).toEqual(['demo.s5', 'demo.s6']);
    expect(lessons[0].id).toBe('demo.cat.0');
  });
});
