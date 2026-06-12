import type { ShortcutDomain } from '@/core/content';
import { categories } from './categories';
import { essentials } from './shortcuts/essentials';
import { fileExplorer } from './shortcuts/file-explorer';
import { screenshots } from './shortcuts/screenshots';
import { system } from './shortcuts/system';
import { taskbar } from './shortcuts/taskbar';
import { virtualDesktops } from './shortcuts/virtual-desktops';
import { windowManagement } from './shortcuts/window-management';
import { windowsKey } from './shortcuts/windows-key';

export const windows11: ShortcutDomain = {
  slug: 'win11',
  name: { en: 'Windows 11', ar: 'ويندوز 11' },
  version: '1.0.0',
  categories,
  // Order matters: lessons are derived by chunking this order per category,
  // so append new shortcuts at the end of their category (see buildLessons).
  shortcuts: [
    ...essentials,
    ...windowsKey,
    ...windowManagement,
    ...virtualDesktops,
    ...screenshots,
    ...fileExplorer,
    ...taskbar,
    ...system,
  ],
};
