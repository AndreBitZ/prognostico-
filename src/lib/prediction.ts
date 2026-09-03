import { calibrateTrio, recordPrediction } from "./calibration";

export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

export type RecentMatch = {
  opponentId: number;
  isHome: boolean;
  scored: number;
  conceded: number;
  utcDate: string;
};

export type RecentForm = {
  games: number;
  gf: number;
  ga: number;
  points: number;
  matches: RecentMatch[];
};

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function negativeBinomialPmf(k: number, lambda: number, r = 9): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  const p = r / (r + lambda);
  let coeff = 1;
  for (let i = 0; i < k; i++) coeff *= (i + r) / (i + 1);
  return coeff * Math.pow(p, r) * Math.pow(1 - p, k);
}

function pickWinner(h: number, d: number, a: number): "home" | "draw" | "away" {
  if (h >= d && h >= a) return "home";
  if (a >= d && a >= h) return "away";
  return "draw";
}

function bradleyTerryProbs(homePpg: number, awayPpg: number) {
  const h = Math.max(0.25, homePpg) + 0.28;
  const a = Math.max(0.25, awayPpg);
  const pHomeNoDraw = h / (h + a);
  const closeness = 1 - Math.abs(pHomeNoDraw - 0.5) * 2;
  const pDraw = Math.max(0.18, Math.min(0.32, 0.2 + 0.14 * closeness));
  const rest = 1 - pDraw;
  return {
    home: pHomeNoDraw * rest,
    draw: pDraw,
    away: (1 - pHomeNoDraw) * rest,
  };
}

function dixonColesTau(
  homeGoals: number,
  awayGoals: number,
  lambdaHome: number,
  lambdaAway: number,
  rho = -0.08
): number {
  if (homeGoals === 0 && awayGoals === 0) return 1 - lambdaHome * lambdaAway * rho;
  if (homeGoals === 0 && awayGoals === 1) return 1 + lambdaHome * rho;
  if (homeGoals === 1 && awayGoals === 0) return 1 + lambdaAway * rho;
  if (homeGoals === 1 && awayGoals === 1) return 1 - rho;
  return 1;
}

export type StandingRow = {
  teamId: number;
  teamName: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  position: number;
};

export type StandingsPack = {
  total: StandingRow[];
  home: StandingRow[];
  away: StandingRow[];
};

function shrinkStrength(observed: number, played: number, prior = 1, priorGames = 6) {
  const n = Math.max(0, played);
  return (observed * n + prior * priorGames) / (n + priorGames);
}

function rowStrength(row: StandingRow | undefined, avgFor: number, avgAgainst: number) {
  if (!row || row.played <= 0) return { attack: 1, defense: 1, ppg: 1 };
  const rawAtk = row.goalsFor / row.played / Math.max(0.4, avgFor);
  const rawDef = row.goalsAgainst / row.played / Math.max(0.4, avgAgainst);
  return {
    attack: shrinkStrength(rawAtk, row.played),
    defense: shrinkStrength(rawDef, row.played),
    ppg: row.points / Math.max(1, row.played),
  };
}

function opponentQuality(standings: StandingRow[], opponentId: number) {
  if (!standings.length) return 1;
  const row = standings.find((r) => r.teamId === opponentId);
  if (!row || row.played <= 0) return 1;
  const avgPpg =
    standings.reduce((s, r) => s + r.points / Math.max(1, r.played), 0) /
    standings.length;
  return Math.max(0.55, Math.min(1.7, row.points / Math.max(1, row.played) / Math.max(0.6, avgPpg)));
}

function opponentAdjustedRates(form: RecentForm, standings: StandingRow[]) {
  if (!form.matches.length) {
    return { gf: form.gf, ga: form.ga, games: form.games };
  }
  let gf = 0;
  let ga = 0;
  let wSum = 0;
  form.matches.forEach((m, idx) => {
    const w = Math.pow(0.85, idx);
    const q = opponentQuality(standings, m.opponentId);
    gf += m.scored * q * w;
    ga += (m.conceded / q) * w;
    wSum += w;
  });
  return {
    gf: wSum > 0 ? gf / wSum : form.gf,
    ga: wSum > 0 ? ga / wSum : form.ga,
    games: form.games,
  };
}

function piRatingFromMatches(form: RecentForm, standings: StandingRow[], isHomeSide: boolean) {
  let rating = 0;
  const chronological = [...form.matches].reverse();
  chronological.forEach((m) => {
    const oppQ = opponentQuality(standings, m.opponentId);
    const oppRating = (oppQ - 1) * 0.8;
    const venue = m.isHome ? 0.28 : -0.28;
    const expected = rating + venue - oppRating;
    const actual = Math.max(-3, Math.min(3, m.scored - m.conceded));
    rating += 0.16 * (actual - expected);
  });
  if (isHomeSide) rating += 0.12;
  return rating;
}

function piProbabilities(homeRating: number, awayRating: number) {
  const diff = homeRating - awayRating;
  const pHomeRaw = 1 / (1 + Math.exp(-1.15 * diff));
  const pAwayRaw = 1 / (1 + Math.exp(1.15 * diff));
  const pDrawRaw = Math.max(0.18, 0.28 - Math.abs(diff) * 0.06);
  const rest = Math.max(0.02, 1 - pDrawRaw);
  const scale = pHomeRaw + pAwayRaw;
  return {
    home: (pHomeRaw / scale) * rest,
    draw: pDrawRaw,
    away: (pAwayRaw / scale) * rest,
  };
}

function sameVenueH2H(
  h2h: JsonRecord | null,
  homeTeamId: number
): { games: number; homeWins: number; draws: number; awayWins: number } {
  const matches = (h2h?.matches as JsonRecord[]) || [];
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 400;
  let games = 0;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  matches.forEach((m) => {
    const when = Date.parse(String(m.utcDate || ""));
    if (!Number.isFinite(when) || when < cutoff) return;
    const home = asRecord(m.homeTeam);
    if (Number(home.id || 0) !== homeTeamId) return;
    const score = asRecord(asRecord(m.score).fullTime);
    const hg = Number(score.home);
    const ag = Number(score.away);
    if (!Number.isFinite(hg) || !Number.isFinite(ag)) return;
    games += 1;
    if (hg > ag) homeWins += 1;
    else if (hg === ag) draws += 1;
    else awayWins += 1;
  });
  return { games, homeWins, draws, awayWins };
}

function leagueHomeAdvantage(standings: StandingsPack) {
  const homeRows = standings.home || [];
  const awayRows = standings.away || [];
  if (!homeRows.length || !awayRows.length) return 1.25;
  const homePlayed = homeRows.reduce((s, r) => s + r.played, 0);
  const awayPlayed = awayRows.reduce((s, r) => s + r.played, 0);
  if (homePlayed < 10 || awayPlayed < 10) return 1.25;
  const homeGf = homeRows.reduce((s, r) => s + r.goalsFor, 0) / homePlayed;
  const awayGf = awayRows.reduce((s, r) => s + r.goalsFor, 0) / awayPlayed;
  const ratio = homeGf / Math.max(0.5, awayGf);
  return Math.max(1.12, Math.min(1.38, ratio));
}

export function buildPoissonPrediction(
  match: {
    id: number;
    homeTeam: { id: number; name: string };
    awayTeam: { id: number; name: string };
  },
  h2h: JsonRecord | null,
  standings: StandingsPack,
  homeForm: RecentForm,
  awayForm: RecentForm,
  market?: { home: number; draw: number; away: number; homeOdd: number; drawOdd: number; awayOdd: number; books: number; source: string } | null
) {
  const MAX_GOALS = 6;
  const total = standings.total || [];
  const HOME_ADVANTAGE = leagueHomeAdvantage(standings);

  let leagueAvgHome = 1.45;
  let leagueAvgAway = 1.15;
  if (total.length > 0) {
    const sumPlayed = total.reduce((s, r) => s + r.played, 0);
    const totalGF = total.reduce((s, r) => s + r.goalsFor, 0);
    if (sumPlayed > 0) {
      const avgPerTeam = totalGF / sumPlayed;
      leagueAvgHome = Math.max(0.8, avgPerTeam * 1.12);
      leagueAvgAway = Math.max(0.6, avgPerTeam * 0.88);
    }
  }

  const homeTotal = total.find((r) => r.teamId === match.homeTeam.id);
  const awayTotal = total.find((r) => r.teamId === match.awayTeam.id);
  const homeHome = (standings.home || []).find((r) => r.teamId === match.homeTeam.id);
  const awayAway = (standings.away || []).find((r) => r.teamId === match.awayTeam.id);

  const homeSeason = rowStrength(homeHome || homeTotal, leagueAvgHome, leagueAvgAway);
  const awaySeason = rowStrength(awayAway || awayTotal, leagueAvgAway, leagueAvgHome);

  const homeAdj = opponentAdjustedRates(homeForm, total);
  const awayAdj = opponentAdjustedRates(awayForm, total);

  const formBlend = (season: number, formRate: number, formGames: number, leagueAvg: number) => {
    if (formGames < 1) return season;
    const formStrength = formRate / Math.max(0.4, leagueAvg);
    const w = Math.min(0.45, 0.12 * formGames);
    return season * (1 - w) + shrinkStrength(formStrength, formGames) * w;
  };

  const homeAttack = formBlend(homeSeason.attack, homeAdj.gf, homeAdj.games, leagueAvgHome);
  const homeDefense = formBlend(homeSeason.defense, homeAdj.ga, homeAdj.games, leagueAvgAway);
  const awayAttack = formBlend(awaySeason.attack, awayAdj.gf, awayAdj.games, leagueAvgAway);
  const awayDefense = formBlend(awaySeason.defense, awayAdj.ga, awayAdj.games, leagueAvgHome);

  let lambdaHome = homeAttack * awayDefense * leagueAvgHome * HOME_ADVANTAGE;
  let lambdaAway = awayAttack * homeDefense * leagueAvgAway;

  const homePpg = homeTotal && homeTotal.played > 0 ? homeTotal.points / homeTotal.played : 1.3;
  const awayPpg = awayTotal && awayTotal.played > 0 ? awayTotal.points / awayTotal.played : 1.1;
  const eloGap = Math.max(-1.2, Math.min(1.2, homePpg - awayPpg));
  lambdaHome *= 1 + eloGap * 0.08;
  lambdaAway *= 1 - eloGap * 0.08;

  lambdaHome = Math.min(3.6, Math.max(0.4, lambdaHome));
  lambdaAway = Math.min(3.2, Math.max(0.3, lambdaAway));

  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  let pOver25 = 0;
  let pBtts = 0;
  const scoreProbs: { score: string; prob: number }[] = [];

  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const base = poissonPmf(i, lambdaHome) * poissonPmf(j, lambdaAway);
      const p = base * dixonColesTau(i, j, lambdaHome, lambdaAway);
      if (i > j) pHome += p;
      else if (i === j) pDraw += p;
      else pAway += p;
      if (i + j >= 3) pOver25 += p;
      if (i > 0 && j > 0) pBtts += p;
      scoreProbs.push({ score: `${i}-${j}`, prob: p });
    }
  }

  const mass = pHome + pDraw + pAway;
  pHome /= mass;
  pDraw /= mass;
  pAway /= mass;
  pOver25 = Math.min(0.95, pOver25 / mass);
  pBtts = Math.min(0.95, pBtts / mass);

  let nbOver = 0;
  let nbBtts = 0;
  let nbMass = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = negativeBinomialPmf(i, lambdaHome) * negativeBinomialPmf(j, lambdaAway);
      nbMass += p;
      if (i + j >= 3) nbOver += p;
      if (i > 0 && j > 0) nbBtts += p;
    }
  }
  if (nbMass > 0) {
    pOver25 = Math.min(0.92, pOver25 * 0.45 + (nbOver / nbMass) * 0.55);
    pBtts = Math.min(0.92, pBtts * 0.45 + (nbBtts / nbMass) * 0.55);
  }

  const homePi = piRatingFromMatches(homeForm, total, true);
  const awayPi = piRatingFromMatches(awayForm, total, false);
  const pi = piProbabilities(homePi, awayPi);
  pHome = pHome * 0.72 + pi.home * 0.28;
  pDraw = pDraw * 0.72 + pi.draw * 0.28;
  pAway = pAway * 0.72 + pi.away * 0.28;
  const tPi = pHome + pDraw + pAway;
  pHome /= tPi;
  pDraw /= tPi;
  pAway /= tPi;

  const venueH2H = sameVenueH2H(h2h, match.homeTeam.id);
  if (venueH2H.games >= 2) {
    const w = Math.min(0.12, 0.04 * venueH2H.games);
    pHome = pHome * (1 - w) + (venueH2H.homeWins / venueH2H.games) * w;
    pDraw = pDraw * (1 - w) + (venueH2H.draws / venueH2H.games) * w;
    pAway = pAway * (1 - w) + (venueH2H.awayWins / venueH2H.games) * w;
    const t2 = pHome + pDraw + pAway;
    pHome /= t2;
    pDraw /= t2;
    pAway /= t2;
  }

  const modelOnly = { home: pHome, draw: pDraw, away: pAway };

  const bt = bradleyTerryProbs(homePpg, awayPpg);
  pHome = pHome * 0.85 + bt.home * 0.15;
  pDraw = pDraw * 0.85 + bt.draw * 0.15;
  pAway = pAway * 0.85 + bt.away * 0.15;
  const tBt = pHome + pDraw + pAway;
  pHome /= tBt;
  pDraw /= tBt;
  pAway /= tBt;

  if (market && market.home + market.draw + market.away > 0) {
    pHome = pHome * 0.75 + market.home * 0.25;
    pDraw = pDraw * 0.75 + market.draw * 0.25;
    pAway = pAway * 0.75 + market.away * 0.25;
    const tm = pHome + pDraw + pAway;
    pHome /= tm;
    pDraw /= tm;
    pAway /= tm;
  }

  const calibrated = calibrateTrio(pHome, pDraw, pAway);
  pHome = calibrated.home;
  pDraw = calibrated.draw;
  pAway = calibrated.away;

  const homePct = Math.round(pHome * 100);
  const drawPct = Math.round(pDraw * 100);
  const awayPct = Math.max(0, 100 - homePct - drawPct);

  const winner = pickWinner(homePct, drawPct, awayPct);
  const piWinner = pickWinner(pi.home, pi.draw, pi.away);
  const btWinner = pickWinner(bt.home, bt.draw, bt.away);
  const marketWinner: "home" | "draw" | "away" | null = market
    ? pickWinner(market.home, market.draw, market.away)
    : null;

  const advice =
    winner === "home"
      ? `Vitória ${match.homeTeam.name}`
      : winner === "away"
        ? `Vitória ${match.awayTeam.name}`
        : "Empate";

  scoreProbs.sort((a, b) => b.prob - a.prob);
  const topScores = scoreProbs.slice(0, 5).map((s) => ({
    score: s.score,
    percent: Math.round((s.prob / mass) * 1000) / 10,
  }));

  const sample = Math.min(homeTotal?.played || 0, awayTotal?.played || 0);
  const edge = Math.max(homePct, drawPct, awayPct);
  const votes = [piWinner, btWinner].filter((v) => v === winner).length;
  const modelsAgree = votes >= 1;
  const threeAgree = winner === piWinner && winner === btWinner;
  const marketAgrees = !marketWinner || marketWinner === winner;
  const modelMarketEdge = market
    ? modelOnly[winner] - market[winner]
    : 0;
  const hasValue = Boolean(market && modelMarketEdge >= 0.05);
  const confidence: "Alta" | "Média" | "Baixa" =
    threeAgree && marketAgrees && sample >= 8 && edge >= 52
      ? "Alta"
      : modelsAgree && sample >= 4 && edge >= 42
        ? "Média"
        : "Baixa";

  recordPrediction(match.id, winner, { home: pHome, draw: pDraw, away: pAway });

  return {
    match,
    predictions: {
      home: homePct,
      draw: drawPct,
      away: awayPct,
      winner,
      advice,
      expectedGoals: {
        home: Math.round(lambdaHome * 100) / 100,
        away: Math.round(lambdaAway * 100) / 100,
      },
      over25: Math.round(pOver25 * 100),
      btts: Math.round(pBtts * 100),
      topScores,
      confidence,
      value: hasValue,
      votes: {
        poisson: winner,
        pi: piWinner,
        bradleyTerry: btWinner,
      },
    },
    market: market
      ? {
          home: Math.round(market.home * 100),
          draw: Math.round(market.draw * 100),
          away: Math.round(market.away * 100),
          homeOdd: market.homeOdd,
          drawOdd: market.drawOdd,
          awayOdd: market.awayOdd,
          books: market.books,
          agrees: marketAgrees,
          value: hasValue,
          edge: Math.round(modelMarketEdge * 1000) / 10,
        }
      : null,
    h2h: h2h ? asRecord(h2h.aggregates) : null,
    standingsContext: {
      home: homeTotal
        ? {
            position: homeTotal.position,
            points: homeTotal.points,
            gf: homeTotal.goalsFor,
            ga: homeTotal.goalsAgainst,
            played: homeTotal.played,
          }
        : null,
      away: awayTotal
        ? {
            position: awayTotal.position,
            points: awayTotal.points,
            gf: awayTotal.goalsFor,
            ga: awayTotal.goalsAgainst,
            played: awayTotal.played,
          }
        : null,
    },
    note: `Poisson + NB + Dixon-Coles + pi-rating + Bradley-Terry${market ? " + mercado 25%" : ""}, com calibração. Casa: ${HOME_ADVANTAGE.toFixed(2)}. Votos ${votes + 1}/3${market ? (marketAgrees ? "; mercado concorda" : "; mercado discorda") : ""}${hasValue ? "; valor vs odd" : ""}. Não constitui conselho de apostas.`,
  };
}
