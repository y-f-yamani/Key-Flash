import type { Locale } from './config';
import { ar } from './dictionaries/ar';
import { en, type Dictionary } from './dictionaries/en';

export { DEFAULT_LOCALE, LOCALES, dirFor, isLocale, type Locale } from './config';
export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, ar };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
