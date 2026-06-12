'use client';

import {
  Bell,
  ClipboardList,
  FileText,
  Folder,
  LayoutGrid,
  Settings,
  Volume2,
  Wifi,
} from 'lucide-react';
import {
  focusedWindow,
  visibleWindows,
  type SimAppId,
  type SimState,
  type SimWindow,
} from '@/core/simulator';
import { cn } from '@/lib/utils';

const APP_META: Record<SimAppId, { label: string; icon: typeof Folder }> = {
  explorer: { label: 'File Explorer', icon: Folder },
  settings: { label: 'Settings', icon: Settings },
  notepad: { label: 'Notepad', icon: FileText },
};

/**
 * The visual Windows 11 desktop. Pure render of SimState — every change
 * animates via CSS transitions so the screen "reacts like Windows".
 * App names stay English deliberately (they're product names on real
 * Windows in any locale); instructions around the sim are localized.
 */
export function SimulatorDesktop({ state, snipSeq }: { state: SimState; snipSeq: number }) {
  const windows = visibleWindows(state);
  const focused = focusedWindow(state);

  return (
    <div
      dir="ltr"
      data-testid="sim-desktop"
      className="relative aspect-video w-full select-none overflow-hidden rounded-xl border border-border bg-gradient-to-br from-sky-600 via-indigo-700 to-violet-800"
    >
      {/* windows layer (above wallpaper, below panels/taskbar) */}
      <div className="absolute inset-x-0 bottom-12 top-0">
        {windows.map((w, i) => (
          <Window key={`${w.app}-${w.desktop}`} w={w} index={i} focused={w === focused} />
        ))}
      </div>

      {state.panel && <Panel panel={state.panel} />}

      {state.snipFlash && (
        <div
          key={snipSeq}
          data-testid="sim-snip"
          className="pointer-events-none absolute inset-0 animate-pulse cursor-crosshair border-4 border-dashed border-white/80 bg-white/20"
        />
      )}

      {/* taskbar */}
      <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-between bg-black/40 px-3 backdrop-blur">
        <div className="w-24" />
        <div className="flex items-center gap-1">
          <TaskbarIcon icon={LayoutGrid} label="Start" />
          {(Object.keys(APP_META) as SimAppId[]).map((app) => {
            const open = state.windows.some(
              (w) => w.app === app && w.desktop === state.activeDesktop,
            );
            const Icon = APP_META[app].icon;
            return (
              <TaskbarIcon
                key={app}
                icon={Icon}
                label={APP_META[app].label}
                open={open}
                data-testid={`taskbar-${app}`}
              />
            );
          })}
        </div>
        <div className="flex w-24 items-center justify-end gap-2 text-white/90">
          {/* virtual desktop indicator */}
          <span className="flex items-center gap-1" data-testid="sim-desktops">
            {Array.from({ length: state.desktopCount }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'size-1.5 rounded-full bg-white/40',
                  i === state.activeDesktop && 'bg-white',
                )}
              />
            ))}
          </span>
          <span className="text-xs tabular-nums">09:41</span>
        </div>
      </div>
    </div>
  );
}

function TaskbarIcon({
  icon: Icon,
  label,
  open,
  ...rest
}: {
  icon: typeof Folder;
  label: string;
  open?: boolean;
} & Record<string, unknown>) {
  return (
    <span
      title={label}
      className="relative flex size-9 items-center justify-center rounded-md text-white/90 transition-colors hover:bg-white/10"
      {...rest}
    >
      <Icon className="size-5" aria-hidden />
      {open && (
        <span className="absolute bottom-0.5 h-0.5 w-3 rounded-full bg-sky-300" aria-hidden />
      )}
    </span>
  );
}

function Window({ w, index, focused }: { w: SimWindow; index: number; focused: boolean }) {
  const { label, icon: Icon } = APP_META[w.app];

  const position =
    w.state === 'maximized'
      ? 'inset-1'
      : w.snap === 'left'
        ? 'left-1 top-1 bottom-1 w-[calc(50%-6px)]'
        : w.snap === 'right'
          ? 'right-1 top-1 bottom-1 w-[calc(50%-6px)]'
          : '';

  // Cascade normal windows so several stay visible.
  const cascade =
    position === '' ? { top: `${8 + index * 7}%`, left: `${14 + index * 9}%` } : undefined;

  return (
    <div
      data-testid={`sim-window-${w.app}`}
      className={cn(
        'absolute flex flex-col overflow-hidden rounded-lg border border-white/20 bg-card text-card-foreground shadow-2xl transition-all duration-300',
        position === '' && 'h-3/5 w-1/2',
        position,
        focused ? 'opacity-100' : 'opacity-80',
      )}
      style={cascade}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-1.5">
        <span className="flex items-center gap-2 text-xs font-semibold">
          <Icon className="size-3.5 text-primary" aria-hidden /> {label}
        </span>
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          <span className="size-2.5 rounded-full bg-danger/70" />
        </span>
      </div>
      <div className="flex-1 p-3 text-xs text-muted-foreground">
        {w.app === 'explorer' && (
          <ul className="grid grid-cols-3 gap-2">
            {['Documents', 'Downloads', 'Pictures', 'Music', 'Videos', 'Desktop'].map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <Folder className="size-4 text-warning" aria-hidden /> {f}
              </li>
            ))}
          </ul>
        )}
        {w.app === 'settings' && (
          <ul className="flex flex-col gap-2">
            {['System', 'Bluetooth & devices', 'Personalization', 'Accounts'].map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <Settings className="size-3.5" aria-hidden /> {s}
              </li>
            ))}
          </ul>
        )}
        {w.app === 'notepad' && <p className="font-mono">The quick brown fox…</p>}
      </div>
    </div>
  );
}

function Panel({ panel }: { panel: NonNullable<SimState['panel']> }) {
  return (
    <div
      data-testid={`sim-panel-${panel}`}
      className="absolute bottom-14 right-2 z-10 w-56 rounded-xl border border-white/20 bg-card/95 p-3 text-xs text-card-foreground shadow-2xl backdrop-blur transition-all"
    >
      {panel === 'clipboard' && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 font-semibold">
            <ClipboardList className="size-3.5 text-primary" aria-hidden /> Clipboard
          </p>
          {['Win + V is amazing', 'keymaster.app', '⌨️'].map((item) => (
            <p key={item} className="rounded-md bg-muted px-2 py-1.5">
              {item}
            </p>
          ))}
        </div>
      )}
      {panel === 'quick-settings' && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 font-semibold">
            <Wifi className="size-3.5 text-primary" aria-hidden /> Quick Settings
          </p>
          <p className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1.5">
            <Wifi className="size-3.5" aria-hidden /> Wi-Fi
          </p>
          <p className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1.5">
            <Volume2 className="size-3.5" aria-hidden /> Volume ▂▄▆
          </p>
        </div>
      )}
      {panel === 'notifications' && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 font-semibold">
            <Bell className="size-3.5 text-primary" aria-hidden /> Notifications
          </p>
          <p className="rounded-md bg-muted px-2 py-1.5">Keyboard hero unlocked 🏆</p>
        </div>
      )}
    </div>
  );
}
