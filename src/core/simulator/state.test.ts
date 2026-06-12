import { describe, expect, it } from 'vitest';
import {
  INITIAL_SIM_STATE,
  actionForShortcut,
  applySimAction,
  focusedWindow,
  visibleWindows,
  type SimState,
} from './state';

function run(...shortcutIds: string[]): SimState {
  return shortcutIds.reduce((state, id) => {
    const action = actionForShortcut(id);
    if (!action) throw new Error(`No sim action for ${id}`);
    return applySimAction(state, action);
  }, INITIAL_SIM_STATE);
}

describe('open-app', () => {
  it('Win+E opens Explorer and focuses it', () => {
    const state = run('win11.win-e');
    expect(visibleWindows(state)).toHaveLength(1);
    expect(focusedWindow(state)?.app).toBe('explorer');
  });

  it('reopening an app restores and focuses instead of duplicating', () => {
    const state = run('win11.win-e', 'win11.win-i', 'win11.win-down', 'win11.win-e');
    // Settings was focused, then minimized? No — win-down minimized Settings;
    // win-e refocuses the existing Explorer window.
    expect(state.windows).toHaveLength(2);
    expect(focusedWindow(state)?.app).toBe('explorer');
  });
});

describe('window management', () => {
  it('Win+Up maximizes the focused window and clears its snap', () => {
    const state = run('win11.win-e', 'win11.win-left', 'win11.win-up');
    expect(focusedWindow(state)).toMatchObject({ state: 'maximized', snap: null });
  });

  it('Win+Left / Win+Right snap the focused window', () => {
    expect(focusedWindow(run('win11.win-e', 'win11.win-left'))?.snap).toBe('left');
    expect(focusedWindow(run('win11.win-e', 'win11.win-right'))?.snap).toBe('right');
  });

  it('Win+Down minimizes; minimized windows are not visible or focusable', () => {
    const state = run('win11.win-e', 'win11.win-down');
    expect(visibleWindows(state)).toHaveLength(0);
    expect(focusedWindow(state)).toBeNull();
  });

  it('window actions with nothing focused are no-ops', () => {
    const state = applySimAction(INITIAL_SIM_STATE, { kind: 'maximize' });
    expect(state.windows).toHaveLength(0);
  });

  it('Win+M minimizes every window on the active desktop only', () => {
    let state = run('win11.win-e', 'win11.win-ctrl-d', 'win11.win-i');
    state = applySimAction(state, { kind: 'minimize-all' });
    expect(state.windows.find((w) => w.app === 'settings')?.state).toBe('minimized');
    expect(state.windows.find((w) => w.app === 'explorer')?.state).toBe('normal');
  });
});

describe('show desktop', () => {
  it('Win+D toggles the desktop without minimizing windows', () => {
    const shown = run('win11.win-e', 'win11.win-d');
    expect(shown.desktopShown).toBe(true);
    expect(visibleWindows(shown)).toHaveLength(0);
    const restored = applySimAction(shown, { kind: 'show-desktop' });
    expect(visibleWindows(restored)).toHaveLength(1);
  });
});

describe('panels', () => {
  it('Win+V opens clipboard history; pressing again closes it', () => {
    const open = run('win11.win-v');
    expect(open.panel).toBe('clipboard');
    expect(applySimAction(open, { kind: 'open-panel', panel: 'clipboard' }).panel).toBeNull();
  });

  it('any other action dismisses an open panel', () => {
    const state = run('win11.win-v', 'win11.win-e');
    expect(state.panel).toBeNull();
  });
});

describe('virtual desktops', () => {
  it('Win+Ctrl+D creates and activates an empty desktop', () => {
    const state = run('win11.win-e', 'win11.win-ctrl-d');
    expect(state.desktopCount).toBe(2);
    expect(state.activeDesktop).toBe(1);
    expect(visibleWindows(state)).toHaveLength(0); // explorer lives on desktop 0
  });

  it('Win+Ctrl+Left/Right move between desktops and clamp at the edges', () => {
    let state = run('win11.win-e', 'win11.win-ctrl-d', 'win11.win-ctrl-left');
    expect(state.activeDesktop).toBe(0);
    expect(visibleWindows(state)).toHaveLength(1);
    state = applySimAction(state, { kind: 'switch-desktop', direction: -1 });
    expect(state.activeDesktop).toBe(0); // clamped
  });
});

describe('snip', () => {
  it('Win+Shift+S raises the one-shot flash flag, cleared by the next action', () => {
    const flashed = run('win11.win-shift-s');
    expect(flashed.snipFlash).toBe(true);
    expect(run('win11.win-shift-s', 'win11.win-e').snipFlash).toBe(false);
  });
});

describe('actionForShortcut', () => {
  it('maps only known shortcuts', () => {
    expect(actionForShortcut('win11.win-e')).toEqual({ kind: 'open-app', app: 'explorer' });
    expect(actionForShortcut('win11.ctrl-c')).toBeNull();
  });
});
