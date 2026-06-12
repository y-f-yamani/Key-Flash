/**
 * Glicko-2 rating system (Glickman, 2022 — http://www.glicko.net/glicko/glicko2.pdf).
 * Pure functions; verified in tests against the paper's worked example.
 *
 * Used for 1v1 ranked matches: both players' ratings update transactionally
 * when a match finalizes (docs/02, Competition context).
 */

export interface Rating {
  /** Display rating (Glicko scale, 1500-centered). */
  readonly rating: number;
  /** Rating deviation — uncertainty; new players start wide at 350. */
  readonly rd: number;
  readonly volatility: number;
}

export interface MatchResult {
  readonly opponent: Rating;
  /** 1 = win, 0.5 = draw, 0 = loss. */
  readonly score: 0 | 0.5 | 1;
}

export const INITIAL_RATING: Rating = { rating: 1500, rd: 350, volatility: 0.06 };

/** System constant — how fast volatility can change. 0.5 is conservative. */
const TAU = 0.5;
const SCALE = 173.7178;
const CONVERGENCE = 1e-6;

/**
 * Updates a rating from a set of results in one rating period.
 * Empty results = inactivity: rating unchanged, RD grows (step 6 only).
 */
export function updateRating(player: Rating, results: readonly MatchResult[]): Rating {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;

  if (results.length === 0) {
    const phiStar = Math.sqrt(phi * phi + player.volatility * player.volatility);
    return { ...player, rd: clampRd(phiStar * SCALE) };
  }

  // Step 3: estimated variance of the player's rating from game outcomes.
  let vInv = 0;
  let deltaSum = 0;
  for (const { opponent, score } of results) {
    const muJ = (opponent.rating - 1500) / SCALE;
    const phiJ = opponent.rd / SCALE;
    const gJ = g(phiJ);
    const eJ = expectedScore(mu, muJ, phiJ);
    vInv += gJ * gJ * eJ * (1 - eJ);
    deltaSum += gJ * (score - eJ);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;

  // Step 5: new volatility via the Illinois variant of regula falsi.
  const sigmaPrime = newVolatility(player.volatility, delta, phi, v);

  // Steps 6–7: new deviation and rating.
  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime);
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muPrime = mu + phiPrime * phiPrime * deltaSum;

  return {
    rating: 1500 + SCALE * muPrime,
    rd: clampRd(phiPrime * SCALE),
    volatility: sigmaPrime,
  };
}

/** Win probability of `mu` against one opponent (Glicko-2 E function). */
export function expectedScore(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function newVolatility(sigma: number, delta: number, phi: number, v: number): number {
  const a = Math.log(sigma * sigma);
  const f = (x: number): number => {
    const ex = Math.exp(x);
    const phi2 = phi * phi;
    const d2 = delta * delta;
    return (
      (ex * (d2 - phi2 - v - ex)) / (2 * (phi2 + v + ex) ** 2) - (x - a) / (TAU * TAU)
    );
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k += 1;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > CONVERGENCE) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }
  return Math.exp(A / 2);
}

function clampRd(rd: number): number {
  // RD never grows beyond a new player's uncertainty, never collapses to 0.
  return Math.min(350, Math.max(30, rd));
}
