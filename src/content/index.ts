import { DomainRegistry, buildLessons, type Lesson } from '@/core/content';
import { windows11 } from './domains/windows-11';

/**
 * The single registry instance for the app. Adding a new domain (VS Code,
 * Office, ...) means adding its folder under `domains/` and one line here.
 */
export const registry = new DomainRegistry([windows11]);

const lessonsByDomain = new Map<string, Lesson[]>(
  registry.listDomains().map((domain) => [domain.slug, buildLessons(domain)]),
);

export function lessonsFor(domainSlug: string): Lesson[] {
  return lessonsByDomain.get(domainSlug) ?? [];
}

export function lessonById(id: string): Lesson | undefined {
  for (const lessons of lessonsByDomain.values()) {
    const found = lessons.find((l) => l.id === id);
    if (found) return found;
  }
  return undefined;
}
