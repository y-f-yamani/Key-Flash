import { parseChord } from '@/core/keyboard';
import type { Capturability } from '@/core/keyboard';
import type { Difficulty, ShortcutDefinition } from '@/core/content';

/**
 * Authoring helper shared by all domain catalogs. Keeps catalog files readable
 * (keys are written as "Win+Shift+S") while producing fully-typed definitions.
 * Malformed keys throw at module load and are caught by catalog tests.
 */
export interface ShortcutEntry {
  slug: string;
  /** One chord ("Win+E") or a sequence (["Win+X", "U"]). */
  keys: string | string[];
  difficulty: Difficulty;
  capturable: Capturability;
  en: { name: string; description: string };
  ar: { name: string; description: string };
}

export function defineShortcuts(
  domainSlug: string,
  categoryId: string,
  entries: readonly ShortcutEntry[],
): ShortcutDefinition[] {
  return entries.map((entry) => ({
    id: `${domainSlug}.${entry.slug}`,
    keys: (Array.isArray(entry.keys) ? entry.keys : [entry.keys]).map(parseChord),
    name: { en: entry.en.name, ar: entry.ar.name },
    description: { en: entry.en.description, ar: entry.ar.description },
    categoryId,
    difficulty: entry.difficulty,
    capturable: entry.capturable,
  }));
}
