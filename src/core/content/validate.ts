import { LOCALES, type ShortcutDomain } from './types';

/**
 * Structural validation for content catalogs. Runs in unit tests so a broken
 * catalog (missing translation, bad category reference, unstable id) fails CI
 * instead of reaching users. Returns all problems, not just the first.
 */
export function validateDomain(domain: ShortcutDomain): string[] {
  const problems: string[] = [];
  const categoryIds = new Set(domain.categories.map((c) => c.id));
  const seenIds = new Set<string>();

  if (!/^[a-z0-9-]+$/.test(domain.slug)) {
    problems.push(`Domain slug "${domain.slug}" must be lowercase kebab-case`);
  }
  if (domain.categories.length === 0) {
    problems.push(`Domain "${domain.slug}" has no categories`);
  }

  for (const shortcut of domain.shortcuts) {
    const where = `Shortcut "${shortcut.id}"`;

    if (!shortcut.id.startsWith(`${domain.slug}.`)) {
      problems.push(`${where}: id must be prefixed with "${domain.slug}."`);
    }
    if (seenIds.has(shortcut.id)) {
      problems.push(`${where}: duplicate id`);
    }
    seenIds.add(shortcut.id);

    if (!categoryIds.has(shortcut.categoryId)) {
      problems.push(`${where}: unknown category "${shortcut.categoryId}"`);
    }
    if (shortcut.keys.length === 0) {
      problems.push(`${where}: empty key sequence`);
    }
    for (const locale of LOCALES) {
      if (!shortcut.name[locale]?.trim()) problems.push(`${where}: missing ${locale} name`);
      if (!shortcut.description[locale]?.trim()) {
        problems.push(`${where}: missing ${locale} description`);
      }
    }
  }

  return problems;
}
