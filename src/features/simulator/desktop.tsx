'use client';

import { type ReactNode } from 'react';
import {
  Bell,
  ClipboardList,
  FileText,
  Folder,
  Search,
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

const APP_META: Record<SimAppId, { label: string; icon: typeof Folder; color: string }> = {
  explorer: { label: 'File Explorer', icon: Folder, color: 'text-amber-400' },
  settings: { label: 'Settings', icon: Settings, color: 'text-sky-400' },
  notepad: { label: 'Notepad', icon: FileText, color: 'text-blue-300' },
};

/**
 * The visual Windows 11 desktop. Pure render of SimState — every change
 * animates via CSS transitions so the screen "reacts like Windows".
 * App names stay English (they're product names in any locale); surrounding
 * instructions are localized. An optional `toast` shows a Windows-style
 * notification for shortcuts that have no window effect (e.g. Copy).
 */
export function SimulatorDesktop({
  state,
  snipSeq,
  toast,
}: {
  state: SimState;
  snipSeq: number;
  toast?: string | null;
}) {
  const windows = visibleWindows(state);
  const focused = focusedWindow(state);

  return (
    <div
      dir="ltr"
      data-testid="sim-desktop"
      className="relative aspect-video w-full select-none overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/40"
    >
      <Wallpaper />

      {/* windows layer (above wallpaper, below panels/taskbar) */}
      <div className="absolute inset-x-0 bottom-12 top-0">
        {windows.map((w, i) => (
          <Window key={`${w.app}-${w.desktop}`} w={w} index={i} focused={w === focused} />
        ))}
      </div>

      {state.taskView && <TaskView state={state} />}
      {state.panel && <Panel panel={state.panel} />}
      {toast && <Toast message={toast} />}

      {state.snipFlash && (
        <div
          key={snipSeq}
          data-testid="sim-snip"
          className="pointer-events-none absolute inset-0 animate-pulse cursor-crosshair border-4 border-dashed border-white/80 bg-white/25"
        />
      )}

      <Taskbar
        openApps={openAppSet(state)}
        desktopCount={state.desktopCount}
        activeDesktop={state.activeDesktop}
      />
    </div>
  );
}

/**
 * A bare Windows 11 screen frame (bloom wallpaper + taskbar) hosting custom
 * window content. Used by lesson previews that animate their own windows
 * (e.g. the text-editor demo) rather than driving full SimState.
 */
export function WindowsScreen({
  children,
  openApps,
}: {
  children: ReactNode;
  openApps?: ReadonlySet<SimAppId>;
}) {
  return (
    <div
      dir="ltr"
      data-testid="sim-desktop"
      className="relative aspect-video w-full select-none overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/40"
    >
      <Wallpaper />
      <div className="absolute inset-x-0 bottom-12 top-0">{children}</div>
      <Taskbar openApps={openApps ?? new Set()} desktopCount={1} activeDesktop={0} />
    </div>
  );
}

function openAppSet(state: SimState): Set<SimAppId> {
  const set = new Set<SimAppId>();
  for (const w of state.windows) if (w.desktop === state.activeDesktop) set.add(w.app);
  return set;
}

/** The shared Windows 11 taskbar: Start orb, search, app icons, clock. */
export function Taskbar({
  openApps,
  desktopCount,
  activeDesktop,
}: {
  openApps: ReadonlySet<SimAppId>;
  desktopCount: number;
  activeDesktop: number;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-between border-t border-white/10 bg-[#1c1c1c]/70 px-3 backdrop-blur-xl">
      <div className="w-28" />
      <div className="flex items-center gap-1.5">
        <TaskbarButton label="Start">
          <StartOrb />
        </TaskbarButton>
        <TaskbarButton label="Search">
          <Search className="size-4 text-white/80" aria-hidden />
        </TaskbarButton>
        {(Object.keys(APP_META) as SimAppId[]).map((app) => {
          const Icon = APP_META[app].icon;
          return (
            <TaskbarButton
              key={app}
              label={APP_META[app].label}
              open={openApps.has(app)}
              testId={`taskbar-${app}`}
            >
              <Icon className={cn('size-4', APP_META[app].color)} aria-hidden />
            </TaskbarButton>
          );
        })}
      </div>
      <div className="flex w-28 items-center justify-end gap-2 text-white/90">
        <span className="flex items-center gap-1" data-testid="sim-desktops">
          {Array.from({ length: desktopCount }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 w-1.5 rounded-full bg-white/40',
                i === activeDesktop && 'w-3 bg-white',
              )}
            />
          ))}
        </span>
        <div className="flex flex-col items-end leading-tight">
          <span className="text-[11px] tabular-nums">09:41</span>
          <span className="text-[9px] text-white/70 tabular-nums">14/06/2026</span>
        </div>
      </div>
    </div>
  );
}

/** Windows 11 "Bloom" wallpaper, approximated with layered light and petals. */
export function Wallpaper() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#15205c] via-[#1b2e8a] to-[#0a1340]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <radialGradient id="glow" cx="50%" cy="52%" r="55%">
            <stop offset="0%" stopColor="#7db4ff" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#4f6bff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0a1340" stopOpacity="0" />
          </radialGradient>
          <filter id="soft"><feGaussianBlur stdDeviation="2.2" /></filter>
        </defs>
        <rect width="160" height="90" fill="url(#glow)" />
        <g filter="url(#soft)" opacity="0.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <ellipse
              key={i}
              cx="80"
              cy="47"
              rx="34"
              ry="10"
              fill="#9cc4ff"
              opacity="0.18"
              transform={`rotate(${i * 30} 80 47)`}
            />
          ))}
        </g>
        <circle cx="80" cy="47" r="7" fill="#dbe9ff" opacity="0.6" filter="url(#soft)" />
      </svg>
    </div>
  );
}

function StartOrb() {
  return (
    <span className="grid size-4 grid-cols-2 gap-[2px]" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className="rounded-[1px] bg-sky-400" />
      ))}
    </span>
  );
}

function TaskbarButton({
  children,
  label,
  open,
  testId,
}: {
  children: ReactNode;
  label: string;
  open?: boolean;
  testId?: string;
}) {
  return (
    <span
      title={label}
      data-testid={testId}
      className="relative flex size-9 items-center justify-center rounded-md transition-colors hover:bg-white/10"
    >
      {children}
      {open && (
        <span className="absolute bottom-0.5 h-[3px] w-3.5 rounded-full bg-sky-300" aria-hidden />
      )}
    </span>
  );
}

export function WindowControls() {
  return (
    <span className="flex items-center text-white/70" aria-hidden>
      <span className="px-2 text-[11px] leading-6 transition-colors hover:bg-white/10">─</span>
      <span className="px-2 text-[10px] leading-6 transition-colors hover:bg-white/10">▢</span>
      <span className="rounded-tr-lg px-2 text-[11px] leading-6 transition-colors hover:bg-red-500 hover:text-white">
        ✕
      </span>
    </span>
  );
}

function Window({ w, index, focused }: { w: SimWindow; index: number; focused: boolean }) {
  const { label, icon: Icon, color } = APP_META[w.app];

  const position =
    w.state === 'maximized'
      ? 'inset-1'
      : w.snap === 'left'
        ? 'left-1 top-1 bottom-1 w-[calc(50%-6px)]'
        : w.snap === 'right'
          ? 'right-1 top-1 bottom-1 w-[calc(50%-6px)]'
          : '';

  const cascade =
    position === '' ? { top: `${9 + index * 7}%`, left: `${14 + index * 9}%` } : undefined;

  return (
    <div
      data-testid={`sim-window-${w.app}`}
      className={cn(
        'animate-window-in absolute flex flex-col overflow-hidden rounded-lg border border-white/15 bg-neutral-900/85 text-neutral-100 shadow-2xl backdrop-blur-md transition-all duration-300',
        position === '' && 'h-3/5 w-1/2',
        position,
        focused ? 'opacity-100 ring-1 ring-white/10' : 'opacity-75',
      )}
      style={cascade}
    >
      <div className="flex items-center justify-between bg-white/5 ps-3">
        <span className="flex items-center gap-2 py-1.5 text-xs font-medium">
          <Icon className={cn('size-3.5', color)} aria-hidden /> {label}
        </span>
        <WindowControls />
      </div>
      <div className="flex-1 bg-neutral-100/95 p-3 text-xs text-neutral-600">
        {w.app === 'explorer' && (
          <ul className="grid grid-cols-3 gap-2">
            {['Documents', 'Downloads', 'Pictures', 'Music', 'Videos', 'Desktop'].map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <Folder className="size-4 text-amber-500" aria-hidden /> {f}
              </li>
            ))}
          </ul>
        )}
        {w.app === 'settings' && (
          <ul className="flex flex-col gap-2">
            {['System', 'Bluetooth & devices', 'Personalization', 'Accounts'].map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <Settings className="size-3.5 text-sky-500" aria-hidden /> {s}
              </li>
            ))}
          </ul>
        )}
        {w.app === 'notepad' && (
          <p className="font-mono text-neutral-700">The quick brown fox…</p>
        )}
      </div>
    </div>
  );
}

/**
 * Win+Tab Task View: every window on the active desktop (minimized included)
 * fanned on top of each other, focused one on top.
 */
function TaskView({ state }: { state: SimState }) {
  const windows = state.windows.filter((w) => w.desktop === state.activeDesktop);

  return (
    <div
      data-testid="sim-taskview"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/50 pb-12 backdrop-blur-md"
    >
      <div className="relative h-2/3 w-2/3">
        {windows.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Task View
          </p>
        )}
        {windows.map((w, i) => {
          const { label, icon: Icon, color } = APP_META[w.app];
          const offset = i - (windows.length - 1) / 2;
          return (
            <div
              key={`${w.app}-${w.desktop}`}
              className="animate-window-in absolute inset-x-0 top-1/2 mx-auto flex h-3/5 w-3/5 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-white/30 bg-neutral-900/90 text-neutral-100 shadow-2xl transition-all"
              style={{
                transform: `translateY(-50%) translateX(${offset * 14}%) rotate(${offset * 4}deg)`,
                zIndex: i,
              }}
            >
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 text-xs font-medium">
                <Icon className={cn('size-3.5', color)} aria-hidden /> {label}
              </div>
              <div className="flex-1 bg-neutral-100/90" />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: state.desktopCount }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-8 w-12 rounded-md border border-white/40 bg-white/10',
              i === state.activeDesktop && 'border-white bg-white/30',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Panel({ panel }: { panel: NonNullable<SimState['panel']> }) {
  return (
    <div
      data-testid={`sim-panel-${panel}`}
      className="absolute bottom-14 right-2 z-10 w-56 rounded-xl border border-white/15 bg-neutral-900/90 p-3 text-xs text-neutral-100 shadow-2xl backdrop-blur-xl transition-all"
    >
      {panel === 'clipboard' && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 font-semibold">
            <ClipboardList className="size-3.5 text-sky-400" aria-hidden /> Clipboard
          </p>
          {['Win + V is amazing', 'keymaster.app', '⌨️'].map((item) => (
            <p key={item} className="rounded-md bg-white/10 px-2 py-1.5">
              {item}
            </p>
          ))}
        </div>
      )}
      {panel === 'quick-settings' && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 font-semibold">
            <Wifi className="size-3.5 text-sky-400" aria-hidden /> Quick Settings
          </p>
          <p className="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1.5">
            <Wifi className="size-3.5" aria-hidden /> Wi-Fi
          </p>
          <p className="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1.5">
            <Volume2 className="size-3.5" aria-hidden /> Volume ▂▄▆
          </p>
        </div>
      )}
      {panel === 'notifications' && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 font-semibold">
            <Bell className="size-3.5 text-sky-400" aria-hidden /> Notifications
          </p>
          <p className="rounded-md bg-white/10 px-2 py-1.5">Keyboard hero unlocked 🏆</p>
        </div>
      )}
    </div>
  );
}

/** Windows-style notification toast (bottom-right, above the taskbar). */
function Toast({ message }: { message: string }) {
  return (
    <div
      data-testid="sim-toast"
      className="animate-window-in absolute bottom-14 right-2 z-20 flex w-56 items-center gap-2 rounded-xl border border-white/15 bg-neutral-900/90 px-3 py-2 text-xs text-neutral-100 shadow-2xl backdrop-blur-xl"
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-sky-500/20 text-sky-300">
        <Bell className="size-3.5" aria-hidden />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="font-semibold">{message}</span>
        <span className="text-[10px] text-white/60">Windows</span>
      </div>
    </div>
  );
}
