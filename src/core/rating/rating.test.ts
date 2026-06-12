import { describe, expect, it } from 'vitest';
import { INITIAL_RATING, updateRating, type MatchResult, type Rating } from './glicko2';
import { TIERS, tierFor } from './tiers';

describe('updateRating', () => {
  it('reproduces the worked example from Glickman\'s Glicko-2 paper', () => {
    // Player: 1500, RD 200, vol 0.06 — beats 1400/30, loses to 1550/100 and 1700/300.
    const player: Rating = { rating: 1500, rd: 200, volatility: 0.06 };
    const results: MatchResult[] = [
      { opponent: { rating: 1400, rd: 30, volatility: 0.06 }, score: 1 },
      { opponent: { rating: 1550, rd: 100, volatility: 0.06 }, score: 0 },
      { opponent: { rating: 1700, rd: 300, volatility: 0.06 }, score: 0 },
    ];
    const updated = updateRating(player, results);
    expect(updated.rating).toBeCloseTo(1464.06, 1);
    expect(updated.rd).toBeCloseTo(151.52, 1);
    expect(updated.volatility).toBeCloseTo(0.05999, 4);
  });

  it('winning raises rating, losing lowers it', () => {
    const win = updateRating(INITIAL_RATING, [{ opponent: INITIAL_RATING, score: 1 }]);
    const loss = updateRating(INITIAL_RATING, [{ opponent: INITIAL_RATING, score: 0 }]);
    expect(win.rating).toBeGreaterThan(INITIAL_RATING.rating);
    expect(loss.rating).toBeLessThan(INITIAL_RATING.rating);
  });

  it('upsets move ratings more than expected results', () => {
    const underdog: Rating = { rating: 1300, rd: 100, volatility: 0.06 };
    const favorite: Rating = { rating: 1700, rd: 100, volatility: 0.06 };
    const upset = updateRating(underdog, [{ opponent: favorite, score: 1 }]);
    const expected = updateRating(favorite, [{ opponent: underdog, score: 1 }]);
    expect(upset.rating - underdog.rating).toBeGreaterThan(expected.rating - favorite.rating);
  });

  it('playing reduces uncertainty; inactivity grows it', () => {
    const afterMatch = updateRating(INITIAL_RATING, [{ opponent: INITIAL_RATING, score: 1 }]);
    expect(afterMatch.rd).toBeLessThan(INITIAL_RATING.rd);

    const established: Rating = { rating: 1600, rd: 80, volatility: 0.06 };
    const idle = updateRating(established, []);
    expect(idle.rd).toBeGreaterThan(established.rd);
    expect(idle.rating).toBe(established.rating);
  });

  it('RD stays within sane bounds', () => {
    let player: Rating = { rating: 1500, rd: 40, volatility: 0.06 };
    for (let i = 0; i < 50; i++) {
      player = updateRating(player, [{ opponent: INITIAL_RATING, score: 1 }]);
    }
    expect(player.rd).toBeGreaterThanOrEqual(30);

    const idleForever = Array.from({ length: 500 }).reduce<Rating>(
      (p) => updateRating(p, []),
      { rating: 1500, rd: 200, volatility: 0.06 },
    );
    expect(idleForever.rd).toBeLessThanOrEqual(350);
  });
});

describe('tierFor', () => {
  it('maps rating bands to all eight tiers in order', () => {
    expect(tierFor(1000)).toBe('bronze');
    expect(tierFor(1300)).toBe('silver');
    expect(tierFor(1500)).toBe('gold');
    expect(tierFor(1700)).toBe('platinum');
    expect(tierFor(1900)).toBe('diamond');
    expect(tierFor(2100)).toBe('master');
    expect(tierFor(2300)).toBe('grandmaster');
    expect(tierFor(2600)).toBe('legend');
  });

  it('is monotonic across the whole range', () => {
    let last = 0;
    for (let rating = 0; rating <= 3000; rating += 10) {
      const index = TIERS.indexOf(tierFor(rating));
      expect(index).toBeGreaterThanOrEqual(last);
      last = index;
    }
  });
});
