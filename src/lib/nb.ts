type VenueMatch = {
  scored: number;
  conceded: number;
  isHome?: boolean;
};

type FormSample = { matches: VenueMatch[] };

export function negativeBinomialPmf(k: number, lambda: number, r = 9): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  const size = Math.max(2, r);
  const p = size / (size + lambda);
  let coeff = 1;
  for (let i = 0; i < k; i++) coeff *= (i + size) / (i + 1);
  return coeff * Math.pow(p, size) * Math.pow(1 - p, k);
}

function sizeFromSamples(samples: number[], priorMean: number, priorIndex = 1.16) {
  const priorVar = Math.max(0.9, priorMean) * priorIndex;
  const priorN = 10;
  const n = samples.length;
  const mean = n > 0 ? samples.reduce((s, x) => s + x, 0) / n : priorMean;
  const rawVar =
    n > 1
      ? samples.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (n - 1)
      : priorVar;
  const w = n / (n + priorN);
  const mu = mean * w + priorMean * (1 - w);
  const variance = rawVar * w + priorVar * (1 - w);
  const extra = Math.max(0.02, variance - mu);
  return Math.max(4, Math.min(22, (mu * mu) / extra));
}

export function estimateNbSizes(
  homeForm: FormSample,
  awayForm: FormSample,
  leagueAvgHome: number,
  leagueAvgAway: number
) {
  const homeGoals: number[] = [];
  const awayGoals: number[] = [];

  homeForm.matches.forEach((m) => {
    if (m.isHome !== false) {
      homeGoals.push(m.scored);
      awayGoals.push(m.conceded);
    } else {
      awayGoals.push(m.scored);
      homeGoals.push(m.conceded);
    }
  });

  awayForm.matches.forEach((m) => {
    if (m.isHome === true) {
      homeGoals.push(m.scored);
      awayGoals.push(m.conceded);
    } else {
      awayGoals.push(m.scored);
      homeGoals.push(m.conceded);
    }
  });

  return {
    home: sizeFromSamples(homeGoals, Math.max(0.85, leagueAvgHome), 1.18),
    away: sizeFromSamples(awayGoals, Math.max(0.7, leagueAvgAway), 1.12),
  };
}

export function venueNbMarkets(
  lambdaHome: number,
  lambdaAway: number,
  homeForm: FormSample,
  awayForm: FormSample,
  leagueAvgHome: number,
  leagueAvgAway: number,
  maxGoals = 6
) {
  const size = estimateNbSizes(homeForm, awayForm, leagueAvgHome, leagueAvgAway);
  let over = 0;
  let btts = 0;
  let mass = 0;
  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const p =
        negativeBinomialPmf(i, lambdaHome, size.home) *
        negativeBinomialPmf(j, lambdaAway, size.away);
      mass += p;
      if (i + j >= 3) over += p;
      if (i > 0 && j > 0) btts += p;
    }
  }
  return {
    home: size.home,
    away: size.away,
    over: mass > 0 ? over / mass : 0.5,
    btts: mass > 0 ? btts / mass : 0.5,
  };
}
