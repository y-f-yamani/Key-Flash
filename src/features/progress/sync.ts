import type { CardRecord, PersonalBest, PlayerState } from './types';

/**
 * Pure sync logic for cloud persistence — kept free of Supabase so it can be
 * exhaustively unit-tested. The repository applies the results.
 */

/**
 * Merges local (possibly signed-out) progress with cloud state on first
 * sign-in. Conservative rules: never lose XP, keep the stronger card, keep
 * the better personal best, keep the longer streak.
 */
export function mergeStates(local: PlayerState, cloud: PlayerState): PlayerState {
  const cards: Record<string, CardRecord> = { ...cloud.cards };
  for (const [id, localCard] of Object.entries(local.cards)) {
    const cloudCard = cards[id];
    cards[id] = cloudCard ? strongerCard(localCard, cloudCard) : localCard;
  }

  const bests: Record<string, PersonalBest> = { ...cloud.bests };
  for (const [mode, localBest] of Object.entries(local.bests)) {
    const cloudBest = bests[mode];
    bests[mode] = !cloudBest || localBest.score > cloudBest.score ? localBest : cloudBest;
  }

  const streak =
    local.streak.current > cloud.streak.current ? local.streak : cloud.streak;

  return {
    version: 1,
    totalXp: Math.max(local.totalXp, cloud.totalXp),
    streak: {
      ...streak,
      longest: Math.max(local.streak.longest, cloud.streak.longest),
    },
    dailyGoalXp: cloud.dailyGoalXp || local.dailyGoalXp,
    today: local.today.dateKey >= cloud.today.dateKey ? local.today : cloud.today,
    cards,
    bests,
  };
}

/** The card that represents more learning: more reps, then longer interval. */
function strongerCard(a: CardRecord, b: CardRecord): CardRecord {
  const learned =
    a.reps !== b.reps ? (a.reps > b.reps ? a : b) : a.intervalDays >= b.intervalDays ? a : b;
  const other = learned === a ? b : a;
  return {
    ...learned,
    // Lifetime counters are additive across devices only when histories
    // diverge; without per-event logs, take the larger (never double-count).
    attempts: Math.max(a.attempts, b.attempts),
    correct: Math.max(a.correct, b.correct),
    bestMs: minDefined(a.bestMs, b.bestMs),
    avgMs: learned.avgMs ?? other.avgMs,
  };
}

function minDefined(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

/** Shortcut ids whose card changed between two snapshots (for diff upserts). */
export function changedCardIds(previous: PlayerState, next: PlayerState): string[] {
  const ids: string[] = [];
  for (const [id, card] of Object.entries(next.cards)) {
    if (previous.cards[id] !== card) ids.push(id);
  }
  return ids;
}
