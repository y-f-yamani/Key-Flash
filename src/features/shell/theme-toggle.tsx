'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/provider';

const THEME_KEY = 'keymaster.theme';

/**
 * Inline <head> script that applies the stored theme before first paint so
 * dark mode never flashes. Kept tiny and dependency-free on purpose.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t? t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}})()`;

// The <html> class is the single source of truth for the theme (the init
// script sets it pre-hydration); this external store lets React read it.
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isDarkSnapshot(): boolean {
  return document.documentElement.classList.contains('dark');
}

function setDark(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
  window.localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  for (const notify of listeners) notify();
}

export function ThemeToggle() {
  const { dict } = useI18n();
  const isDark = useSyncExternalStore(subscribe, isDarkSnapshot, () => false);

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={dict.a11y.toggleTheme}
      onClick={() => setDark(!isDark)}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
