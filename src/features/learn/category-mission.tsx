'use client';

import { MissionRunner } from '@/features/simulator/mission-runner';
import { useI18n } from '@/lib/i18n/provider';

/** A category's simulator capstone — finishing returns to the Learning Path. */
export function CategoryMission({ shortcutIds }: { shortcutIds: string[] }) {
  const { locale, dict } = useI18n();
  return (
    <MissionRunner
      missionShortcutIds={shortcutIds}
      completeHref={`/${locale}/learn`}
      completeLabel={dict.path.backToPath}
    />
  );
}
