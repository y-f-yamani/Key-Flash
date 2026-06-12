import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseChord, parseSequence } from '@/core/keyboard';
import type { ShortcutDefinition } from '@/core/content';
import { renderWithProviders } from '@/test/render';
import { DrillSession } from './drill-session';

const copy: ShortcutDefinition = {
  id: 'win11.ctrl-c',
  keys: [parseChord('Ctrl+C')],
  name: { en: 'Copy', ar: 'نسخ' },
  description: { en: 'Copy the selection.', ar: 'انسخ التحديد.' },
  categoryId: 'essentials',
  difficulty: 1,
  capturable: 'full',
};

const explorer: ShortcutDefinition = {
  ...copy,
  id: 'win11.win-e',
  keys: [parseChord('Win+E')],
  name: { en: 'File Explorer', ar: 'مستكشف الملفات' },
  capturable: 'partial',
};

const quickLink: ShortcutDefinition = {
  ...copy,
  id: 'win11.win-x-u',
  keys: parseSequence('Win+X', 'U'),
  name: { en: 'Quick Link', ar: 'ارتباط سريع' },
  capturable: 'partial',
};

describe('DrillSession with real keyboard events', () => {
  it('completes a drill when the correct chord is pressed', async () => {
    renderWithProviders(<DrillSession shortcuts={[copy]} />);
    expect(screen.getByText('Copy')).toBeInTheDocument();

    fireEvent.keyDown(window, { code: 'KeyC', ctrlKey: true });
    expect(await screen.findByText(/Correct!/)).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('drill-next'));
    expect(screen.getByTestId('session-complete')).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 1/)).toBeInTheDocument();
  });

  it('marks a wrong chord and shows what was pressed and expected', async () => {
    renderWithProviders(<DrillSession shortcuts={[copy]} />);

    fireEvent.keyDown(window, { code: 'KeyV', ctrlKey: true });
    expect(await screen.findByText(/Not quite/)).toBeInTheDocument();
    expect(screen.getByText(/You pressed/)).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('drill-next'));
    expect(screen.getByText(/0 \/ 1/)).toBeInTheDocument();
  });

  it('ignores modifier-only presses while a chord is being formed', () => {
    renderWithProviders(<DrillSession shortcuts={[copy]} />);
    fireEvent.keyDown(window, { code: 'ControlLeft', ctrlKey: true });
    expect(screen.queryByText(/Correct!/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Not quite/)).not.toBeInTheDocument();
  });

  it('accepts the Ctrl+Alt practice remap for Win-key shortcuts (ADR-0004)', async () => {
    renderWithProviders(<DrillSession shortcuts={[explorer]} />);
    expect(screen.getByText(/hold Ctrl \+ Alt instead/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { code: 'KeyE', ctrlKey: true, altKey: true });
    expect(await screen.findByText(/Correct!/)).toBeInTheDocument();
  });

  it('walks multi-step sequences', async () => {
    renderWithProviders(<DrillSession shortcuts={[quickLink]} />);

    fireEvent.keyDown(window, { code: 'KeyX', ctrlKey: true, altKey: true });
    expect(await screen.findByText(/\(2\/2\)/)).toBeInTheDocument();

    fireEvent.keyDown(window, { code: 'KeyU' });
    expect(await screen.findByText(/Correct!/)).toBeInTheDocument();
  });

  it('runs quiz drills for non-capturable shortcuts and reports completion', async () => {
    const onComplete = vi.fn();
    const lockPc: ShortcutDefinition = {
      ...copy,
      id: 'win11.win-l',
      keys: [parseChord('Win+L')],
      name: { en: 'Lock PC', ar: 'قفل الجهاز' },
      capturable: 'none',
    };
    renderWithProviders(<DrillSession shortcuts={[lockPc]} onComplete={onComplete} />);

    expect(screen.getByTestId('quiz-drill')).toBeInTheDocument();
    // The correct option renders the expected keycaps: Win + L.
    const buttons = screen.getAllByRole('button');
    const correct = buttons.find((b) => b.textContent?.includes('Win') && b.textContent.includes('L'));
    expect(correct).toBeDefined();

    await userEvent.click(correct!);
    await userEvent.click(screen.getByTestId('drill-next'));
    expect(onComplete).toHaveBeenCalledWith([
      expect.objectContaining({ shortcutId: 'win11.win-l', correct: true }),
    ]);
  });
});
