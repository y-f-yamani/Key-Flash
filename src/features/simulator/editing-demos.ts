/**
 * Bespoke "what this editing shortcut does" demos for the lesson teach card.
 * These shortcuts have no window/OS effect the simulator can show, so instead
 * we animate a Notepad document (select → copy, paste, undo, save, …). Pure
 * mapping so it stays trivially testable and easy to extend.
 */
export type EditingDemoKind =
  | 'copy'
  | 'cut'
  | 'paste'
  | 'selectAll'
  | 'undo'
  | 'redo'
  | 'save';

const DEMOS: Record<string, EditingDemoKind> = {
  'win11.ctrl-c': 'copy',
  'win11.ctrl-x': 'cut',
  'win11.ctrl-v': 'paste',
  'win11.ctrl-a': 'selectAll',
  'win11.ctrl-z': 'undo',
  'win11.ctrl-y': 'redo',
  'win11.ctrl-s': 'save',
};

export function editingDemoFor(shortcutId: string): EditingDemoKind | null {
  return DEMOS[shortcutId] ?? null;
}
