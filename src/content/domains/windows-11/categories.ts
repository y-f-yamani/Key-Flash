import type { ShortcutCategory } from '@/core/content';

export const categories: ShortcutCategory[] = [
  {
    id: 'essentials',
    order: 1,
    name: { en: 'Essentials', ar: 'الأساسيات' },
    description: {
      en: 'The universal shortcuts every Windows user needs daily.',
      ar: 'الاختصارات الأساسية التي يحتاجها كل مستخدم ويندوز يوميًا.',
    },
  },
  {
    id: 'windows-key',
    order: 2,
    name: { en: 'Windows Key', ar: 'مفتاح ويندوز' },
    description: {
      en: 'Launch system apps and panels instantly with the ⊞ key.',
      ar: 'افتح تطبيقات النظام ولوحاته فورًا باستخدام مفتاح ⊞.',
    },
  },
  {
    id: 'window-management',
    order: 3,
    name: { en: 'Window Management', ar: 'إدارة النوافذ' },
    description: {
      en: 'Snap, switch, minimize and arrange windows like a pro.',
      ar: 'ثبّت النوافذ وبدّل بينها ورتّبها باحترافية.',
    },
  },
  {
    id: 'virtual-desktops',
    order: 4,
    name: { en: 'Virtual Desktops', ar: 'أسطح المكتب الافتراضية' },
    description: {
      en: 'Create and move between multiple desktops.',
      ar: 'أنشئ أسطح مكتب متعددة وتنقّل بينها.',
    },
  },
  {
    id: 'screenshots',
    order: 5,
    name: { en: 'Screenshots', ar: 'لقطات الشاشة' },
    description: {
      en: 'Capture the screen, a window, or any region.',
      ar: 'التقط الشاشة كاملة أو نافذة أو أي جزء منها.',
    },
  },
  {
    id: 'file-explorer',
    order: 6,
    name: { en: 'File Explorer', ar: 'مستكشف الملفات' },
    description: {
      en: 'Navigate folders and manage files without the mouse.',
      ar: 'تنقّل بين المجلدات وأدر الملفات دون فأرة.',
    },
  },
  {
    id: 'taskbar',
    order: 7,
    name: { en: 'Taskbar', ar: 'شريط المهام' },
    description: {
      en: 'Drive the taskbar and pinned apps from the keyboard.',
      ar: 'تحكّم في شريط المهام والتطبيقات المثبتة من لوحة المفاتيح.',
    },
  },
  {
    id: 'system',
    order: 8,
    name: { en: 'System & Security', ar: 'النظام والأمان' },
    description: {
      en: 'Task Manager, locking, accessibility and power moves.',
      ar: 'مدير المهام والقفل وإمكانية الوصول وأدوات متقدمة.',
    },
  },
];
