function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type MatchAnalysis = {
  lambda: { home: number; away: number; total: number };
  attack: { home: number; away: number };
  defense: { home: number; away: number };
  homeAdvantage: number;
  rho: number;
  form: {
    homeGf: number;
    homeGa: number;
    awayGf: number;
    awayGa: number;
    homeGames: number;
    awayGames: number;
  };
  elo: {
    home: number | null;
    away: number | null;
    diff: number | null;
    expectedHomeWin: number | null;
  };
  expectedPoints: { home: number; away: number };
  cleanSheet: { home: number; away: number };
  winByTwo: { home: number; away: number };
  under15: number;
  over35: number;
  entropyBits: number;
  sources: string[];
};

export function buildMatchAnalysis(input: {
  lambdaHome: number;
  lambdaAway: number;
  homeAttack: number;
  homeDefense: number;
  awayAttack: number;
  awayDefense: number;
  homeAdvantage: number;
  rho: number;
  pHome: number;
  pDraw: number;
  pAway: number;
  homeFormGf: number;
  homeFormGa: number;
  awayFormGf: number;
  awayFormGa: number;
  homeFormGames: number;
  awayFormGames: number;
  homeElo?: number | null;
  awayElo?: number | null;
  usedClubElo: boolean;
  usedXG: boolean;
  usedMarket: boolean;
}): MatchAnalysis {
  const { lambdaHome, lambdaAway } = input;
  let pCsHome = 0;
  let pCsAway = 0;
  let pWin2Home = 0;
  let pWin2Away = 0;
  let pUnder15 = 0;
  let pOver35 = 0;

  for (let i = 0; i <= 6; i++) {
    for (let j = 0; j <= 6; j++) {
      const p = poissonPmf(i, lambdaHome) * poissonPmf(j, lambdaAway);
      if (j === 0) pCsHome += p;
      if (i === 0) pCsAway += p;
      if (i >= j + 2) pWin2Home += p;
      if (j >= i + 2) pWin2Away += p;
      if (i + j <= 1) pUnder15 += p;
      if (i + j >= 4) pOver35 += p;
    }
  }

  const entropy =
    [input.pHome, input.pDraw, input.pAway].reduce((s, p) => {
      if (p <= 0) return s;
      return s - p * Math.log2(p);
    }, 0);

  let expectedHomeWin: number | null = null;
  let diff: number | null = null;
  if (input.homeElo && input.awayElo && input.homeElo > 1000 && input.awayElo > 1000) {
    diff = round1(input.homeElo - input.awayElo);
    const homeAdj = input.homeElo + 80;
    expectedHomeWin = round2(1 / (1 + Math.pow(10, (input.awayElo - homeAdj) / 400)));
  }

  const sources = ["football-data.org"];
  if (input.usedClubElo) sources.push("ClubElo");
  if (input.usedXG) sources.push("Understat");
  if (input.usedMarket) sources.push("The Odds API");

  return {
    lambda: {
      home: round2(lambdaHome),
      away: round2(lambdaAway),
      total: round2(lambdaHome + lambdaAway),
    },
    attack: {
      home: round2(input.homeAttack),
      away: round2(input.awayAttack),
    },
    defense: {
      home: round2(input.homeDefense),
      away: round2(input.awayDefense),
    },
    homeAdvantage: round2(input.homeAdvantage),
    rho: input.rho,
    form: {
      homeGf: round2(input.homeFormGf),
      homeGa: round2(input.homeFormGa),
      awayGf: round2(input.awayFormGf),
      awayGa: round2(input.awayFormGa),
      homeGames: Math.round(input.homeFormGames * 10) / 10,
      awayGames: Math.round(input.awayFormGames * 10) / 10,
    },
    elo: {
      home: input.usedClubElo ? round1(input.homeElo || 0) : null,
      away: input.usedClubElo ? round1(input.awayElo || 0) : null,
      diff,
      expectedHomeWin,
    },
    expectedPoints: {
      home: round2(3 * input.pHome + input.pDraw),
      away: round2(3 * input.pAway + input.pDraw),
    },
    cleanSheet: {
      home: Math.round(pCsHome * 100),
      away: Math.round(pCsAway * 100),
    },
    winByTwo: {
      home: Math.round(pWin2Home * 100),
      away: Math.round(pWin2Away * 100),
    },
    under15: Math.round(pUnder15 * 100),
    over35: Math.round(pOver35 * 100),
    entropyBits: round2(entropy),
    sources,
  };
}
