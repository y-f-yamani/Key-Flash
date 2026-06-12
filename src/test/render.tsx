import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { InMemoryProgressRepository, ProgressProvider } from '@/features/progress';
import { getDictionary } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/provider';

/** Renders a component inside the app providers with an in-memory repository. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(
    <I18nProvider locale="en" dict={getDictionary('en')}>
      <ProgressProvider repository={new InMemoryProgressRepository()}>{ui}</ProgressProvider>
    </I18nProvider>,
  );
}
