/**
 * Competitive tiers over Glicko-2 ratings. Boundaries chosen so a fresh
 * 1500-rated player lands mid-ladder (Gold) and Windows Legend is rare air.
 * Matches the `ratings.tier` enum in the database.
 */

export const TIERS = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'master',
  'grandmaster',
  'legend',
] as const;

export type Tier = (typeof TIERS)[number];

const THRESHOLDS: readonly { tier: Tier; min: number }[] = [
  { tier: 'legend', min: 2400 },
  { tier: 'grandmaster', min: 2200 },
  { tier: 'master', min: 2000 },
  { tier: 'diamond', min: 1800 },
  { tier: 'platinum', min: 1650 },
  { tier: 'gold', min: 1450 },
  { tier: 'silver', min: 1250 },
  { tier: 'bronze', min: 0 },
];

export function tierFor(rating: number): Tier {
  return THRESHOLDS.find((t) => rating >= t.min)?.tier ?? 'bronze';
}
