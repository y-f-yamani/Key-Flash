import { defineShortcuts } from '@/content/define';

export const taskbar = defineShortcuts('win11', 'taskbar', [
  {
    slug: 'win-1',
    keys: 'Win+1',
    difficulty: 2,
    capturable: 'partial',
    en: { name: 'First pinned app', description: 'Open or focus the first app on the taskbar.' },
    ar: { name: 'التطبيق المثبت الأول', description: 'افتح أول تطبيق في شريط المهام أو انتقل إليه.' },
  },
  {
    slug: 'win-2',
    keys: 'Win+2',
    difficulty: 2,
    capturable: 'partial',
    en: { name: 'Second pinned app', description: 'Open or focus the second app on the taskbar.' },
    ar: { name: 'التطبيق المثبت الثاني', description: 'افتح ثاني تطبيق في شريط المهام أو انتقل إليه.' },
  },
  {
    slug: 'win-shift-1',
    keys: 'Win+Shift+1',
    difficulty: 4,
    capturable: 'partial',
    en: { name: 'New app instance', description: 'Open a new instance of the first taskbar app.' },
    ar: { name: 'نسخة جديدة من التطبيق', description: 'افتح نسخة جديدة من أول تطبيق في شريط المهام.' },
  },
  {
    slug: 'win-t',
    keys: 'Win+T',
    difficulty: 3,
    capturable: 'partial',
    en: { name: 'Cycle taskbar', description: 'Cycle focus through taskbar apps.' },
    ar: { name: 'التنقل في شريط المهام', description: 'تنقّل بين تطبيقات شريط المهام.' },
  },
  {
    slug: 'win-b',
    keys: 'Win+B',
    difficulty: 4,
    capturable: 'partial',
    en: { name: 'System tray', description: 'Focus the first icon in the system tray.' },
    ar: { name: 'منطقة الإشعارات', description: 'انتقل إلى أول أيقونة في منطقة الإشعارات.' },
  },
]);
