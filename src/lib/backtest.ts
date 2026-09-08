import { getOpenFootballMatches } from "./football-json";
import { getLeagueParams } from "./league-params";
import { pick1x2 } from "./pick-1x2";

type OFMatch = {
  date?: string;
  team1?: string;
  team2?: string;
  score?: { ft?: [number, number] | number[] };
};

export type BacktestRow = {
  date: string;
  home: string;
  away: string;
  score: string;
  actual: "home" | "draw" | "away";
  predicted: "home" | "draw" | "away";
  pHome: number;
  pDraw: number;
  pAway: number;
  hit: boolean;
  brier: number;
};

export type BacktestResult = {
  league: string;
  n: number;
  accuracy: number;
  brier: number;
  byOutcome: { home: number; draw: number; away: number };
  predictedShare: { home: number; draw: number; away: number };
  rows: BacktestRow[];
};

function fact(n: number) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function pois(k: number, lambda: number) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact(k);
}

function trio(lambdaH: number, lambdaA: number, rho: number) {
  let h = 0;
  let d = 0;
  let a = 0;
  for (let i = 0; i <= 6; i++) {
    for (let j = 0; j <= 6; j++) {
      let tau = 1;
      if (i === 0 && j === 0) tau = 1 - lambdaH * lambdaA * rho;
      else if (i === 0 && j === 1) tau = 1 + lambdaH * rho;
      else if (i === 1 && j === 0) tau = 1 + lambdaA * rho;
      else if (i === 1 && j === 1) tau = 1 - rho;
      const p = pois(i, lambdaH) * pois(j, lambdaA) * tau;
      if (i > j) h += p;
      else if (i === j) d += p;
      else a += p;
    }
  }
  const s = h + d + a || 1;
  return { home: h / s, draw: d / s, away: a / s };
}

export async function runBacktest(leagueCode: string): Promise<BacktestResult> {
  const params = getLeagueParams(leagueCode);
  const matches = (await getOpenFootballMatches(leagueCode)) as OFMatch[];
  const finished = matches
    .filter(
      (m) =>
        m.date &&
        m.team1 &&
        m.team2 &&
        Array.isArray(m.score?.ft) &&
        m.score!.ft!.length >= 2
    )
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const stats = new Map<string, { played: number; gf: number; ga: number }>();
  const ensure = (name: string) => {
    if (!stats.has(name)) stats.set(name, { played: 0, gf: 0, ga: 0 });
    return stats.get(name)!;
  };

  const rows: BacktestRow[] = [];
  let gamesSoFar = 0;
  let sumHg = 0;
  let sumAg = 0;

  for (const m of finished) {
    const hg = Number(m.score!.ft![0]);
    const ag = Number(m.score!.ft![1]);
    const home = m.team1!;
    const away = m.team2!;
    const hs = ensure(home);
    const as = ensure(away);

    if (hs.played >= 4 && as.played >= 4 && gamesSoFar >= 20) {
      const avgH = sumHg / gamesSoFar;
      const avgA = sumAg / gamesSoFar;
      const atkH = hs.gf / hs.played / Math.max(0.5, avgH);
      const defH = hs.ga / hs.played / Math.max(0.5, avgA);
      const atkA = as.gf / as.played / Math.max(0.5, avgA);
      const defA = as.ga / as.played / Math.max(0.5, avgH);
      let lambdaH = atkH * defA * avgH * params.homeAdvantageFallback;
      let lambdaA = atkA * defH * avgA;
      lambdaH = Math.min(3.6, Math.max(0.4, lambdaH));
      lambdaA = Math.min(3.2, Math.max(0.3, lambdaA));
      const p = trio(lambdaH, lambdaA, params.rho);
      const actual: "home" | "draw" | "away" =
        hg > ag ? "home" : hg === ag ? "draw" : "away";
      const predicted = pick1x2(p.home, p.draw, p.away);
      const oH = actual === "home" ? 1 : 0;
      const oD = actual === "draw" ? 1 : 0;
      const oA = actual === "away" ? 1 : 0;
      const brier =
        (p.home - oH) ** 2 + (p.draw - oD) ** 2 + (p.away - oA) ** 2;
      rows.push({
        date: String(m.date),
        home,
        away,
        score: `${hg}-${ag}`,
        actual,
        predicted,
        pHome: Math.round(p.home * 100),
        pDraw: Math.round(p.draw * 100),
        pAway: Math.round(p.away * 100),
        hit: predicted === actual,
        brier: Math.round(brier * 1000) / 1000,
      });
    }

    hs.played += 1;
    hs.gf += hg;
    hs.ga += ag;
    as.played += 1;
    as.gf += ag;
    as.ga += hg;
    gamesSoFar += 1;
    sumHg += hg;
    sumAg += ag;
  }

  const n = rows.length;
  const hits = rows.filter((r) => r.hit).length;
  const brier = n ? rows.reduce((s, r) => s + r.brier, 0) / n : 0;
  const count = (k: BacktestRow["actual"]) =>
    n ? rows.filter((r) => r.actual === k).length / n : 0;
  const pred = (k: BacktestRow["predicted"]) =>
    n ? rows.filter((r) => r.predicted === k).length / n : 0;

  return {
    league: leagueCode,
    n,
    accuracy: n ? hits / n : 0,
    brier,
    byOutcome: { home: count("home"), draw: count("draw"), away: count("away") },
    predictedShare: { home: pred("home"), draw: pred("draw"), away: pred("away") },
    rows: rows.slice(-40).reverse(),
  };
}
