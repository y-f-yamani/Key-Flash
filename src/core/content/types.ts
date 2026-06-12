import type { Capturability, KeyChord } from '../keyboard';

/**
 * Content contracts. Everything outside `src/content` (trainer, SRS, arena,
 * leaderboards) works exclusively against these types — adding a new domain
 * (VS Code, Office, ...) requires no engine or UI changes. See ADR-0002.
 */

export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

/** Every user-facing string ships in all supported locales. Enforced by tests. */
export type LocalizedText = Readonly<Record<Locale, string>>;

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface ShortcutDefinition {
  /** Globally unique, stable forever: "<domainSlug>.<slug>". Never recycled. */
  readonly id: string;
  /** The chord sequence; almost always length 1 (e.g. [Win+E]). */
  readonly keys: readonly KeyChord[];
  readonly name: LocalizedText;
  readonly description: LocalizedText;
  readonly categoryId: string;
  readonly difficulty: Difficulty;
  readonly capturable: Capturability;
}

export interface ShortcutCategory {
  readonly id: string;
  readonly name: LocalizedText;
  readonly description: LocalizedText;
  /** Position in the learning path; lower comes first. */
  readonly order: number;
}

export interface ShortcutDomain {
  /** Stable slug used in URLs, analytics and DB rows, e.g. "win11". */
  readonly slug: string;
  readonly name: LocalizedText;
  /** Bump when shortcuts are added/changed — recorded with run submissions. */
  readonly version: string;
  readonly categories: readonly ShortcutCategory[];
  readonly shortcuts: readonly ShortcutDefinition[];
}

/** A teachable unit: a small ordered group of shortcuts within a category. */
export interface Lesson {
  readonly id: string;
  readonly domainSlug: string;
  readonly categoryId: string;
  readonly index: number;
  readonly shortcutIds: readonly string[];
}
