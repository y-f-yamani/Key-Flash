/**
 * Windows 11 simulator — a pure state machine. The UI renders SimState and
 * dispatches the action mapped from whichever shortcut the user physically
 * pressed; this module never touches React or the DOM.
 *
 * Deliberately simplified Windows semantics: enough fidelity that the screen
 * "reacts like Windows" (docs/05 Phase 4), not an OS reimplementation.
 */

export type SimAppId = 'explorer' | 'settings' | 'notepad';

export type SimWindowState = 'normal' | 'maximized' | 'minimized';

export interface SimWindow {
  readonly app: SimAppId;
  readonly state: SimWindowState;
  readonly snap: 'left' | 'right' | null;
  /** Which virtual desktop the window lives on (0-based). */
  readonly desktop: number;
}

export type SimPanel = 'clipboard' | 'quick-settings' | 'notifications' | null;

export interface SimState {
  /** Last entry is the focused window. */
  readonly windows: readonly SimWindow[];
  readonly desktopCount: number;
  readonly activeDesktop: number;
  readonly panel: SimPanel;
  /** Win+D state — windows hidden, wallpaper visible. */
  readonly desktopShown: boolean;
  /** One-shot flag the UI uses to flash the snip overlay. */
  readonly snipFlash: boolean;
}

export const INITIAL_SIM_STATE: SimState = {
  windows: [],
  desktopCount: 1,
  activeDesktop: 0,
  panel: null,
  desktopShown: false,
  snipFlash: false,
};

export type SimAction =
  | { kind: 'open-app'; app: SimAppId }
  | { kind: 'maximize' }
  | { kind: 'minimize' }
  | { kind: 'snap'; side: 'left' | 'right' }
  | { kind: 'show-desktop' }
  | { kind: 'minimize-all' }
  | { kind: 'open-panel'; panel: Exclude<SimPanel, null> }
  | { kind: 'new-desktop' }
  | { kind: 'switch-desktop'; direction: 1 | -1 }
  | { kind: 'snip' };

/** Windows the user can currently see (active desktop, not minimized). */
export function visibleWindows(state: SimState): SimWindow[] {
  if (state.desktopShown) return [];
  return state.windows.filter(
    (w) => w.desktop === state.activeDesktop && w.state !== 'minimized',
  );
}

export function focusedWindow(state: SimState): SimWindow | null {
  const visible = visibleWindows(state);
  return visible.length === 0 ? null : visible[visible.length - 1];
}

export function applySimAction(state: SimState, action: SimAction): SimState {
  // Any interaction dismisses transient surfaces.
  const base: SimState = { ...state, panel: null, snipFlash: false };

  switch (action.kind) {
    case 'open-app': {
      const existing = state.windows.find(
        (w) => w.app === action.app && w.desktop === state.activeDesktop,
      );
      if (existing) {
        // Restore + focus (move to end of z-order).
        const rest = state.windows.filter((w) => w !== existing);
        return {
          ...base,
          desktopShown: false,
          windows: [...rest, { ...existing, state: 'normal' }],
        };
      }
      const window: SimWindow = {
        app: action.app,
        state: 'normal',
        snap: null,
        desktop: state.activeDesktop,
      };
      return { ...base, desktopShown: false, windows: [...state.windows, window] };
    }

    case 'maximize':
      return updateFocused(base, (w) => ({ ...w, state: 'maximized', snap: null }));

    case 'minimize':
      return updateFocused(base, (w) => ({ ...w, state: 'minimized', snap: null }));

    case 'snap':
      return updateFocused(base, (w) => ({ ...w, state: 'normal', snap: action.side }));

    case 'show-desktop':
      return { ...base, desktopShown: !state.desktopShown };

    case 'minimize-all':
      return {
        ...base,
        desktopShown: false,
        windows: state.windows.map((w) =>
          w.desktop === state.activeDesktop ? { ...w, state: 'minimized' as const } : w,
        ),
      };

    case 'open-panel':
      // Toggling the same panel closes it.
      return { ...base, panel: state.panel === action.panel ? null : action.panel };

    case 'new-desktop':
      return {
        ...base,
        desktopCount: state.desktopCount + 1,
        activeDesktop: state.desktopCount,
        desktopShown: false,
      };

    case 'switch-desktop': {
      const next = Math.min(
        state.desktopCount - 1,
        Math.max(0, state.activeDesktop + action.direction),
      );
      return { ...base, activeDesktop: next, desktopShown: false };
    }

    case 'snip':
      return { ...base, snipFlash: true };
  }
}

function updateFocused(state: SimState, update: (w: SimWindow) => SimWindow): SimState {
  const focused = focusedWindow(state);
  if (!focused) return state;
  return {
    ...state,
    windows: state.windows.map((w) => (w === focused ? update(w) : w)),
  };
}

/**
 * Which simulator action a catalog shortcut performs. Shortcuts without an
 * entry simply have no visual effect in the simulator (yet).
 */
const SHORTCUT_ACTIONS: Record<string, SimAction> = {
  'win11.win-e': { kind: 'open-app', app: 'explorer' },
  'win11.win-i': { kind: 'open-app', app: 'settings' },
  'win11.win-up': { kind: 'maximize' },
  'win11.win-down': { kind: 'minimize' },
  'win11.win-left': { kind: 'snap', side: 'left' },
  'win11.win-right': { kind: 'snap', side: 'right' },
  'win11.win-d': { kind: 'show-desktop' },
  'win11.win-m': { kind: 'minimize-all' },
  'win11.win-v': { kind: 'open-panel', panel: 'clipboard' },
  'win11.win-a': { kind: 'open-panel', panel: 'quick-settings' },
  'win11.win-n': { kind: 'open-panel', panel: 'notifications' },
  'win11.win-ctrl-d': { kind: 'new-desktop' },
  'win11.win-ctrl-right': { kind: 'switch-desktop', direction: 1 },
  'win11.win-ctrl-left': { kind: 'switch-desktop', direction: -1 },
  'win11.win-shift-s': { kind: 'snip' },
};

export function actionForShortcut(shortcutId: string): SimAction | null {
  return SHORTCUT_ACTIONS[shortcutId] ?? null;
}
