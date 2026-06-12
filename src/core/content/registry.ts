import type { Lesson, ShortcutDefinition, ShortcutDomain } from './types';

/**
 * Read-only access to registered shortcut domains. Constructed once at module
 * load (content is static code); consumers receive it via import or injection.
 */
export class DomainRegistry {
  private readonly domains = new Map<string, ShortcutDomain>();
  private readonly shortcutIndex = new Map<string, ShortcutDefinition>();

  constructor(domains: readonly ShortcutDomain[]) {
    for (const domain of domains) {
      if (this.domains.has(domain.slug)) {
        throw new Error(`Duplicate domain slug "${domain.slug}"`);
      }
      this.domains.set(domain.slug, domain);
      for (const shortcut of domain.shortcuts) {
        if (this.shortcutIndex.has(shortcut.id)) {
          throw new Error(`Duplicate shortcut id "${shortcut.id}"`);
        }
        this.shortcutIndex.set(shortcut.id, shortcut);
      }
    }
  }

  listDomains(): ShortcutDomain[] {
    return [...this.domains.values()];
  }

  getDomain(slug: string): ShortcutDomain | undefined {
    return this.domains.get(slug);
  }

  getShortcut(id: string): ShortcutDefinition | undefined {
    return this.shortcutIndex.get(id);
  }

  shortcutsInCategory(domainSlug: string, categoryId: string): ShortcutDefinition[] {
    const domain = this.domains.get(domainSlug);
    if (!domain) return [];
    return domain.shortcuts.filter((s) => s.categoryId === categoryId);
  }
}

export const LESSON_SIZE = 5;

/**
 * Derives lessons by chunking each category's shortcuts (catalog order) into
 * groups of LESSON_SIZE. Deterministic, so lesson ids are stable as long as
 * catalog order is stable — append new shortcuts at category end.
 */
export function buildLessons(domain: ShortcutDomain): Lesson[] {
  const lessons: Lesson[] = [];
  for (const category of [...domain.categories].sort((a, b) => a.order - b.order)) {
    const shortcuts = domain.shortcuts.filter((s) => s.categoryId === category.id);
    for (let i = 0; i < shortcuts.length; i += LESSON_SIZE) {
      const index = i / LESSON_SIZE;
      lessons.push({
        id: `${domain.slug}.${category.id}.${index}`,
        domainSlug: domain.slug,
        categoryId: category.id,
        index,
        shortcutIds: shortcuts.slice(i, i + LESSON_SIZE).map((s) => s.id),
      });
    }
  }
  return lessons;
}
