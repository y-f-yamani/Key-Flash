import { defineShortcuts } from '@/content/define';

export const screenshots = defineShortcuts('win11', 'screenshots', [
  {
    slug: 'win-shift-s',
    keys: 'Win+Shift+S',
    difficulty: 1,
    capturable: 'partial',
    en: { name: 'Snip a region', description: 'Open the Snipping Tool to capture part of the screen.' },
    ar: { name: 'اقتصاص جزء من الشاشة', description: 'افتح أداة القص لالتقاط جزء من الشاشة.' },
  },
  {
    slug: 'printscreen',
    keys: 'PrintScreen',
    difficulty: 1,
    capturable: 'partial',
    en: { name: 'Copy full screen', description: 'Copy the entire screen to the clipboard.' },
    ar: { name: 'نسخ الشاشة كاملة', description: 'انسخ الشاشة كاملة إلى الحافظة.' },
  },
  {
    slug: 'alt-printscreen',
    keys: 'Alt+PrintScreen',
    difficulty: 2,
    capturable: 'partial',
    en: { name: 'Copy active window', description: 'Copy only the active window to the clipboard.' },
    ar: { name: 'نسخ النافذة النشطة', description: 'انسخ النافذة النشطة فقط إلى الحافظة.' },
  },
  {
    slug: 'win-printscreen',
    keys: 'Win+PrintScreen',
    difficulty: 2,
    capturable: 'partial',
    en: { name: 'Save full screenshot', description: 'Save a full-screen capture to the Screenshots folder.' },
    ar: { name: 'حفظ لقطة كاملة', description: 'احفظ لقطة للشاشة كاملة في مجلد لقطات الشاشة.' },
  },
]);
