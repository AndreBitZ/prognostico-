type VenueMatch = {
  scored: number;
  conceded: number;
  isHome?: boolean;
  opponentId?: number;
};

type FormSample = { matches: VenueMatch[] };

export type NbOptions = {
  competitionCode?: string;
  matchday?: number;
  quality?: (opponentId: number) => number;
};

const LEAGUE_DI: Record<string, { home: number; away: number }> = {
  PL: { home: 1.14, away: 1.1 },
  PPL: { home: 1.22, away: 1.16 },
  BL1: { home: 1.2, away: 1.14 },
  SA: { home: 1.12, away: 1.1 },
  PD: { home: 1.16, away: 1.12 },
  FL1: { home: 1.18, away: 1.14 },
  DED: { home: 1.22, away: 1.16 },
  BSA: { home: 1.24, away: 1.18 },
  CL: { home: 1.16, away: 1.14 },
};

export function leagueDispersion(code?: string) {
  if (!code) return { home: 1.16, away: 1.12 };
  return LEAGUE_DI[code] || { home: 1.16, away: 1.12 };
}

export function negativeBinomialPmf(k: number, lambda: number, r = 9): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  const size = Math.max(2, r);
  const p = size / (size + lambda);
  let coeff = 1;
  for (let i = 0; i < k; i++) coeff *= (i + size) / (i + 1);
  return coeff * Math.pow(p, size) * Math.pow(1 - p, k);
}

function sizeFromPearson(
  actuals: number[],
  expecteds: number[],
  priorMean: number,
  priorDi: number,
  matchday?: number
) {
  const priorN = 10;
  const n = Math.min(actuals.length, expecteds.length);
  let pearson = 0;
  let muSum = 0;
  for (let i = 0; i < n; i++) {
    const mu = Math.max(0.35, expecteds[i]);
    pearson += ((actuals[i] - mu) * (actuals[i] - mu)) / mu;
    muSum += mu;
  }
  const sampleDi = n > 0 ? pearson / n : priorDi;
  const w = n / (n + priorN);
  const di = Math.max(1.02, sampleDi * w + priorDi * (1 - w));
  const mu = n > 0 ? muSum / n : priorMean;
  let r = mu / Math.max(0.02, di - 1);
  r = Math.max(4, Math.min(22, r));
  if ((matchday || 99) <= 6) r = Math.max(8, r);
  return r;
}

function collectVenueGoals(
  homeForm: FormSample,
  awayForm: FormSample,
  leagueAvgHome: number,
  leagueAvgAway: number,
  quality?: (opponentId: number) => number
) {
  const homeActual: number[] = [];
  const homeExpected: number[] = [];
  const awayActual: number[] = [];
  const awayExpected: number[] = [];
  const q = (id?: number) => (id && quality ? quality(id) : 1);

  const pushPair = (m: VenueMatch, teamWasHome: boolean) => {
    const oppQ = q(m.opponentId);
    if (teamWasHome) {
      homeActual.push(m.scored);
      homeExpected.push(leagueAvgHome * Math.max(0.6, Math.min(1.5, oppQ)));
      awayActual.push(m.conceded);
      awayExpected.push(leagueAvgAway / Math.max(0.6, Math.min(1.5, oppQ)));
    } else {
      awayActual.push(m.scored);
      awayExpected.push(leagueAvgAway * Math.max(0.6, Math.min(1.5, oppQ)));
      homeActual.push(m.conceded);
      homeExpected.push(leagueAvgHome / Math.max(0.6, Math.min(1.5, oppQ)));
    }
  };

  homeForm.matches.forEach((m) => pushPair(m, m.isHome !== false));
  awayForm.matches.forEach((m) => pushPair(m, m.isHome === true));

  return { homeActual, homeExpected, awayActual, awayExpected };
}

export function estimateNbSizes(
  homeForm: FormSample,
  awayForm: FormSample,
  leagueAvgHome: number,
  leagueAvgAway: number,
  options: NbOptions = {}
) {
  const prior = leagueDispersion(options.competitionCode);
  const collected = collectVenueGoals(
    homeForm,
    awayForm,
    leagueAvgHome,
    leagueAvgAway,
    options.quality
  );
  return {
    home: sizeFromPearson(
      collected.homeActual,
      collected.homeExpected,
      Math.max(0.85, leagueAvgHome),
      prior.home,
      options.matchday
    ),
    away: sizeFromPearson(
      collected.awayActual,
      collected.awayExpected,
      Math.max(0.7, leagueAvgAway),
      prior.away,
      options.matchday
    ),
  };
}

export function venueNbMarkets(
  lambdaHome: number,
  lambdaAway: number,
  homeForm: FormSample,
  awayForm: FormSample,
  leagueAvgHome: number,
  leagueAvgAway: number,
  options: NbOptions = {},
  maxGoals = 6
) {
  const size = estimateNbSizes(
    homeForm,
    awayForm,
    leagueAvgHome,
    leagueAvgAway,
    options
  );
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
