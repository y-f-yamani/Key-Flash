import { defineShortcuts } from '@/content/define';

export const system = defineShortcuts('win11', 'system', [
  {
    slug: 'ctrl-shift-esc',
    keys: 'Ctrl+Shift+Esc',
    difficulty: 1,
    capturable: 'none',
    en: { name: 'Task Manager', description: 'Open Task Manager directly.' },
    ar: { name: 'مدير المهام', description: 'افتح مدير المهام مباشرة.' },
  },
  {
    slug: 'ctrl-alt-del',
    keys: 'Ctrl+Alt+Delete',
    difficulty: 1,
    capturable: 'none',
    en: { name: 'Security screen', description: 'Open the security screen (lock, sign out, Task Manager).' },
    ar: { name: 'شاشة الأمان', description: 'افتح شاشة الأمان (قفل، تسجيل خروج، مدير المهام).' },
  },
  {
    slug: 'win-l',
    keys: 'Win+L',
    difficulty: 1,
    capturable: 'none',
    en: { name: 'Lock PC', description: 'Lock your computer immediately.' },
    ar: { name: 'قفل الجهاز', description: 'اقفل جهازك فورًا.' },
  },
  {
    slug: 'win-space',
    keys: 'Win+Space',
    difficulty: 2,
    capturable: 'partial',
    en: { name: 'Switch layout', description: 'Switch keyboard language and layout.' },
    ar: { name: 'تبديل اللغة', description: 'بدّل لغة لوحة المفاتيح وتخطيطها.' },
  },
  {
    slug: 'win-u',
    keys: 'Win+U',
    difficulty: 3,
    capturable: 'partial',
    en: { name: 'Accessibility', description: 'Open accessibility settings.' },
    ar: { name: 'إمكانية الوصول', description: 'افتح إعدادات إمكانية الوصول.' },
  },
  {
    slug: 'win-plus',
    keys: 'Win+Plus',
    difficulty: 3,
    capturable: 'partial',
    en: { name: 'Magnifier', description: 'Open Magnifier and zoom in.' },
    ar: { name: 'المكبّر', description: 'افتح المكبّر وقرّب العرض.' },
  },
]);
