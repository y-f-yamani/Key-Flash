import { expect, test, type Page } from '@playwright/test';

/**
 * Next's DEV error overlay surfaces console warnings as a click-blocking
 * dialog (production builds have no overlay). Strip it so clicks reach the
 * app — the warning itself (inline theme script on on-demand-rendered pages)
 * is dev-only noise from next/script beforeInteractive.
 */
async function removeDevOverlay(page: Page) {
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('nextjs-portal')?.remove());
}

test.describe('smoke', () => {
  test('root redirects to the default locale and shows the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Master every Windows 11 shortcut',
    );
  });

  test('arabic locale renders RTL', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('learning path teaches then tests the current node', async ({ page }) => {
    await page.goto('/en/learn');
    // Fresh player: only the first node (Essentials lesson 1) is unlocked.
    await page.getByRole('button', { name: 'Start', exact: true }).first().click();
    await expect(page).toHaveURL(/\/en\/learn\/essentials\/0$/);

    // A lesson now opens in the LEARN phase (teach cards) before testing.
    await expect(page.getByTestId('lesson-teach')).toBeVisible();
    await expect(page.getByTestId('keyboard-view').first()).toBeVisible();

    // Click through Learn into Practice.
    for (let i = 0; i < 8; i++) {
      if (await page.getByTestId('capture-drill').isVisible().catch(() => false)) break;
      await page.getByTestId('teach-next').click();
    }

    // First drill of Essentials lesson 1 is Copy (Ctrl+C) — press the real
    // keys, but only once the drill reports its listener is attached.
    await expect(page.getByTestId('capture-drill')).toHaveAttribute('data-armed', 'true');
    await page.keyboard.press('Control+c');
    await expect(page.getByText('Correct!')).toBeVisible();
  });

  test('learning path locks later nodes until earlier ones are done', async ({ page }) => {
    await page.goto('/en/learn');
    await expect(page.getByText('You are here')).toBeVisible();
    // Locked nodes show the lock hint, not a Start button.
    await expect(page.getByText('Finish the step below to unlock').first()).toBeVisible();
  });

  test('sprint run starts and shows a live timer', async ({ page }) => {
    await page.goto('/en/arena/sprint');
    await removeDevOverlay(page);
    await page.getByTestId('start-sprint').click();
    await expect(page.getByTestId('sprint-running')).toBeVisible();
  });

  test('typing test runs and measures live WPM from real keystrokes', async ({ page }) => {
    await page.goto('/en/typing');
    await removeDevOverlay(page);
    await page.getByTestId('start-typing').click();
    await expect(page.getByTestId('typing-running')).toBeVisible();

    await page.keyboard.type('the quick brown fox jumps', { delay: 25 });
    // Live HUD switches from the "type to begin" hint to WPM + accuracy.
    await expect(page.getByText(/WPM/)).toBeVisible();
    await expect(page.getByText(/%/)).toBeVisible();
  });

  test('simulator: Win+E mission opens the simulated File Explorer', async ({ page }) => {
    await page.goto('/en/simulator');
    await removeDevOverlay(page);
    await expect(page.getByTestId('sim-desktop')).toBeVisible();

    // Mission 1 is Win+E; the browser-safe practice remap is Ctrl+Alt+E.
    await page.keyboard.press('Control+Alt+e');
    await expect(page.getByTestId('sim-window-explorer')).toBeVisible();
    await expect(page.getByTestId('mission-done')).toBeVisible();

    // Mission 2 (Win+I) opens Settings after the success pause.
    await expect(page.getByText('Settings', { exact: true })).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Control+Alt+i');
    await expect(page.getByTestId('sim-window-settings')).toBeVisible();

    // Mission 3 (Alt+Tab) switches focus back to Explorer.
    await expect(page.getByText('Switch apps', { exact: true })).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Alt+Tab');
    await expect(page.getByTestId('mission-done')).toBeVisible();
  });

  test('reaction test flags a false start when Space is pressed early', async ({ page }) => {
    await page.goto('/en/arena/reaction');
    await removeDevOverlay(page);
    await page.getByTestId('start-reaction').click();
    await expect(page.getByTestId('reaction-waiting')).toBeVisible();

    // The signal needs ≥1.5s — pressing immediately is always a false start.
    await page.keyboard.press('Space');
    await expect(page.getByTestId('reaction-false-start')).toBeVisible();
  });

  test('duel page gates ranked play behind sign-in', async ({ page }) => {
    await page.goto('/en/arena/duel');
    await expect(page.getByText('Sign in to play ranked duels.')).toBeVisible();
  });

  test('typing duel page exists and gates behind sign-in', async ({ page }) => {
    await page.goto('/en/typing/duel');
    await expect(page.getByRole('heading', { name: 'Typing Duel' })).toBeVisible();
    await expect(page.getByText('Sign in to play ranked duels.')).toBeVisible();
  });

  test('survival mode shows lives and ends after three misses', async ({ page }) => {
    await page.goto('/en/arena/survival');
    await removeDevOverlay(page);
    await page.getByTestId('start-sprint').click();
    await expect(page.getByTestId('sprint-running')).toBeVisible();

    // Three wrong chords burn all lives and finish the run.
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Shift+F9');
    }
    await expect(page.getByTestId('sprint-results')).toBeVisible();
  });
});
