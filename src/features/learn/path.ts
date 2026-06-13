import { lessonsFor, registry } from '@/content';
import { actionForShortcut } from '@/core/simulator';
// Import from leaf modules (not the feature barrel) so this stays usable in
// server components without pulling the client progress provider.
import { mastery } from '@/features/progress/state';
import type { PlayerState } from '@/features/progress/types';

/**
 * The unified Learning Path: a single bottom-to-top journey where each
 * category's lesson nodes are topped by a "capstone" that makes the user
 * *apply* the shortcuts — in the Windows simulator when the category has
 * simulator-mappable shortcuts, otherwise as a recall challenge over the
 * whole category. Progression is linear: a node unlocks only when every
 * earlier node is complete.
 *
 * Pure functions over the catalog + player state, so the whole structure
 * and unlock logic are unit-testable without React.
 */

export type PathNodeKind = 'lesson' | 'capstone-sim' | 'capstone-drill';

export interface PathNode {
  /** Stable id, also used as the React key and for progress lookups. */
  readonly id: string;
  readonly kind: PathNodeKind;
  readonly categoryId: string;
  /** Present for lesson nodes. */
  readonly lessonIndex?: number;
  /** Shortcuts this node teaches or tests. */
  readonly shortcutIds: readonly string[];
}

export interface PathCategory {
  readonly categoryId: string;
  readonly nodes: readonly PathNode[];
}

export type NodeStatus = 'done' | 'current' | 'locked';

/** Simulator-mappable, browser-capturable shortcuts in a category. */
function simShortcutIds(domainSlug: string, categoryId: string): string[] {
  return registry
    .shortcutsInCategory(domainSlug, categoryId)
    .filter((s) => s.capturable !== 'none' && actionForShortcut(s.id) !== null)
    .map((s) => s.id);
}

/** Builds the ordered category → nodes structure for a domain. */
export function buildLearningPath(domainSlug: string): PathCategory[] {
  const domain = registry.getDomain(domainSlug);
  if (!domain) return [];

  const categories = [...domain.categories].sort((a, b) => a.order - b.order);
  return categories.map((category) => {
    const lessons = lessonsFor(domainSlug).filter((l) => l.categoryId === category.id);
    const nodes: PathNode[] = lessons.map((lesson) => ({
      id: `${category.id}.lesson.${lesson.index}`,
      kind: 'lesson',
      categoryId: category.id,
      lessonIndex: lesson.index,
      shortcutIds: lesson.shortcutIds,
    }));

    const simIds = simShortcutIds(domainSlug, category.id);
    if (simIds.length > 0) {
      nodes.push({
        id: `${category.id}.capstone`,
        kind: 'capstone-sim',
        categoryId: category.id,
        shortcutIds: simIds,
      });
    } else {
      nodes.push({
        id: `${category.id}.capstone`,
        kind: 'capstone-drill',
        categoryId: category.id,
        shortcutIds: registry.shortcutsInCategory(domainSlug, category.id).map((s) => s.id),
      });
    }
    return { categoryId: category.id, nodes };
  });
}

/** Flattens the path into the single ordered sequence the climb follows. */
export function flattenPath(path: readonly PathCategory[]): PathNode[] {
  return path.flatMap((category) => category.nodes);
}

/** A node is complete once every shortcut in it has been attempted at least once. */
export function isNodeComplete(node: PathNode, state: PlayerState): boolean {
  if (node.shortcutIds.length === 0) return false;
  return node.shortcutIds.every((id) => (state.cards[id]?.attempts ?? 0) > 0);
}

/**
 * Linear-unlock status for every node: complete nodes are 'done', the first
 * incomplete node is 'current', everything after it is 'locked'.
 */
export function nodeStatuses(
  path: readonly PathCategory[],
  state: PlayerState,
): Map<string, NodeStatus> {
  const statuses = new Map<string, NodeStatus>();
  let prevAllComplete = true;
  for (const node of flattenPath(path)) {
    const done = isNodeComplete(node, state);
    statuses.set(node.id, done ? 'done' : prevAllComplete ? 'current' : 'locked');
    prevAllComplete = prevAllComplete && done;
  }
  return statuses;
}

export function nodeMastery(node: PathNode, state: PlayerState): number {
  return mastery(state, node.shortcutIds);
}
