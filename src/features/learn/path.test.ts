import { describe, expect, it } from 'vitest';
import { INITIAL_PLAYER_STATE, type CardRecord, type PlayerState } from '@/features/progress';
import {
  buildLearningPath,
  flattenPath,
  isNodeComplete,
  nodeStatuses,
} from './path';

const path = buildLearningPath('win11');

function stateWithCards(shortcutIds: string[]): PlayerState {
  const cards: Record<string, CardRecord> = {};
  for (const id of shortcutIds) {
    cards[id] = {
      ease: 2.5,
      intervalDays: 1,
      dueAt: 0,
      reps: 1,
      lapses: 0,
      attempts: 1,
      correct: 1,
      bestMs: 500,
      avgMs: 500,
    };
  }
  return { ...INITIAL_PLAYER_STATE, cards };
}

describe('buildLearningPath', () => {
  it('mirrors the catalog category order and ends each category in a capstone', () => {
    const domainCategories = ['essentials', 'windows-key', 'window-management'];
    expect(path.slice(0, 3).map((c) => c.categoryId)).toEqual(domainCategories);
    for (const category of path) {
      const last = category.nodes[category.nodes.length - 1];
      expect(last.kind).toMatch(/^capstone-/);
      expect(last.id).toBe(`${category.categoryId}.capstone`);
    }
  });

  it('gives simulator-capable categories a sim capstone, others a drill capstone', () => {
    const winKey = path.find((c) => c.categoryId === 'windows-key')!;
    const essentials = path.find((c) => c.categoryId === 'essentials')!;
    expect(winKey.nodes.at(-1)!.kind).toBe('capstone-sim');
    expect(essentials.nodes.at(-1)!.kind).toBe('capstone-drill');
    // The sim capstone only lists shortcuts the simulator can actually react to.
    expect(winKey.nodes.at(-1)!.shortcutIds).toContain('win11.win-e');
  });

  it('every lesson node carries its lesson shortcuts', () => {
    const lessonNodes = flattenPath(path).filter((n) => n.kind === 'lesson');
    expect(lessonNodes.length).toBeGreaterThan(0);
    for (const node of lessonNodes) {
      expect(node.lessonIndex).toBeTypeOf('number');
      expect(node.shortcutIds.length).toBeGreaterThan(0);
    }
  });
});

describe('isNodeComplete', () => {
  it('is complete only when every shortcut has been attempted', () => {
    const node = flattenPath(path)[0];
    expect(isNodeComplete(node, INITIAL_PLAYER_STATE)).toBe(false);
    expect(isNodeComplete(node, stateWithCards([...node.shortcutIds]))).toBe(true);
    // Missing even one shortcut keeps it incomplete.
    expect(isNodeComplete(node, stateWithCards([node.shortcutIds[0]]))).toBe(
      node.shortcutIds.length === 1,
    );
  });
});

describe('nodeStatuses (linear unlock)', () => {
  it('opens only the first node for a brand-new player', () => {
    const statuses = nodeStatuses(path, INITIAL_PLAYER_STATE);
    const flat = flattenPath(path);
    expect(statuses.get(flat[0].id)).toBe('current');
    expect(statuses.get(flat[1].id)).toBe('locked');
    expect(statuses.get(flat[2].id)).toBe('locked');
  });

  it('completing the first node makes the second current and keeps the third locked', () => {
    const flat = flattenPath(path);
    const state = stateWithCards([...flat[0].shortcutIds]);
    const statuses = nodeStatuses(path, state);
    expect(statuses.get(flat[0].id)).toBe('done');
    expect(statuses.get(flat[1].id)).toBe('current');
    expect(statuses.get(flat[2].id)).toBe('locked');
  });

  it('completing every shortcut marks the whole path done', () => {
    const allIds = flattenPath(path).flatMap((n) => [...n.shortcutIds]);
    const statuses = nodeStatuses(path, stateWithCards(allIds));
    expect([...statuses.values()].every((s) => s === 'done')).toBe(true);
  });
});
