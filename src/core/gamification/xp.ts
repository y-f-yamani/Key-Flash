/**
 * XP and level curve. XP is an append-only quantity (earned, never deducted);
 * levels are a pure projection of total XP and therefore never go down.
 */

export const XP_REWARDS = {
  drillCorrect: 10,
  drillCorrectFast: 15,
  lessonCompleted: 50,
  reviewSessionCompleted: 30,
  dailyGoalMet: 25,
  sprintRun: 20, // base; arena adds score-proportional bonus
} as const;

export type XpSource = keyof typeof XP_REWARDS | 'arenaBonus';

/** Total XP required to *reach* a level. Level 1 = 0 XP. Monotonic, gently super-linear. */
export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  // 100, 240, 416, 624, ... — early levels come quickly, later levels stretch out.
  return Math.round(100 * Math.pow(level - 1, 1.4));
}

export function levelFromXp(totalXp: number): number {
  let level = 1;
  while (totalXpForLevel(level + 1) <= totalXp) level += 1;
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP earned inside the current level. */
  current: number;
  /** XP needed to go from this level to the next. */
  required: number;
  /** 0..1 fraction toward the next level. */
  fraction: number;
}

export function levelProgress(totalXp: number): LevelProgress {
  const level = levelFromXp(totalXp);
  const floor = totalXpForLevel(level);
  const ceiling = totalXpForLevel(level + 1);
  const required = ceiling - floor;
  const current = totalXp - floor;
  return { level, current, required, fraction: required === 0 ? 0 : current / required };
}
