import { defineShortcuts } from '@/content/define';

export const virtualDesktops = defineShortcuts('win11', 'virtual-desktops', [
  {
    slug: 'win-ctrl-d',
    keys: 'Win+Ctrl+D',
    difficulty: 3,
    capturable: 'partial',
    en: { name: 'New desktop', description: 'Create a new virtual desktop.' },
    ar: { name: 'سطح مكتب جديد', description: 'أنشئ سطح مكتب افتراضيًا جديدًا.' },
  },
  {
    slug: 'win-ctrl-right',
    keys: 'Win+Ctrl+Right',
    difficulty: 3,
    capturable: 'partial',
    en: { name: 'Next desktop', description: 'Switch to the virtual desktop on the right.' },
    ar: { name: 'سطح المكتب التالي', description: 'انتقل إلى سطح المكتب الافتراضي على اليمين.' },
  },
  {
    slug: 'win-ctrl-left',
    keys: 'Win+Ctrl+Left',
    difficulty: 3,
    capturable: 'partial',
    en: { name: 'Previous desktop', description: 'Switch to the virtual desktop on the left.' },
    ar: { name: 'سطح المكتب السابق', description: 'انتقل إلى سطح المكتب الافتراضي على اليسار.' },
  },
  {
    slug: 'win-ctrl-f4',
    keys: 'Win+Ctrl+F4',
    difficulty: 3,
    capturable: 'partial',
    en: { name: 'Close desktop', description: 'Close the current virtual desktop.' },
    ar: { name: 'إغلاق سطح المكتب', description: 'أغلق سطح المكتب الافتراضي الحالي.' },
  },
]);
