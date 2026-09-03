const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
const FOOTBALL_DATA_KEY =
  process.env.FOOTBALL_DATA_KEY || "082eb6bed08a412387ab9b8ef0578617";
const THESPORTSDB_KEY = process.env.THESPORTSDB_KEY || "123";

export const MAIN_LEAGUES = [
  { id: "PL", name: "Premier League", country: "Inglaterra" },
  { id: "PD", name: "La Liga", country: "Espanha" },
  { id: "SA", name: "Serie A", country: "Itália" },
  { id: "BL1", name: "Bundesliga", country: "Alemanha" },
  { id: "FL1", name: "Ligue 1", country: "França" },
  { id: "CL", name: "Champions League", country: "Europa" },
  { id: "PPL", name: "Primeira Liga", country: "Portugal" },
  { id: "DED", name: "Eredivisie", country: "Países Baixos" },
  { id: "BSA", name: "Brasileirão", country: "Brasil" },
];

type JsonRecord = Record<string, unknown>;

function getDateString(daysFromNow = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

async function fetchFootballData(
  endpoint: string,
  params: Record<string, string> = {}
) {
  const url = new URL(`${FOOTBALL_DATA_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  const res = await fetch(url.toString(), {
    headers: { "X-Auth-Token": FOOTBALL_DATA_KEY },
    next: { revalidate: 1800 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Football-Data error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function getTeamLogo(teamName: string): Promise<string | null> {
  if (!teamName) return null;
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_KEY}/searchteams.php?t=${encodeURIComponent(
      teamName
    )}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    const team = data?.teams?.[0];
    return team?.strBadge || team?.strLogo || team?.strTeamBadge || null;
  } catch {
    return null;
  }
}

export async function getFixtures(options: { league?: string } = {}) {
  const dateFrom = getDateString(0);
  const dateTo = getDateString(7);

  if (options.league) {
    const data = await fetchFootballData(`/competitions/${options.league}/matches`, {
      dateFrom,
      dateTo,
    });
    return normalizeMatches(data.matches || []);
  }

  const data = await fetchFootballData("/matches", { dateFrom, dateTo });
  return normalizeMatches(data.matches || []);
}

export async function getFixtureById(id: number | string) {
  const data = await fetchFootballData(`/matches/${id}`);
  const match = normalizeMatch(data);
  if (!match) return null;

  if (!match.homeTeam.crest) {
    match.homeTeam.crest = await getTeamLogo(match.homeTeam.name);
  }
  if (!match.awayTeam.crest) {
    match.awayTeam.crest = await getTeamLogo(match.awayTeam.name);
  }

  return match;
}

async function getCompetitionStandings(competitionCodeOrId: string | number) {
  try {
    const data = await fetchFootballData(
      `/competitions/${competitionCodeOrId}/standings`
    );
    const tables = (data.standings || []) as JsonRecord[];

    const parseTable = (type: string): StandingRow[] => {
      const table = tables.find((t) => t.type === type);
      return ((table?.table as JsonRecord[]) || []).map((row) => {
        const team = asRecord(row.team);
        return {
          teamId: Number(team.id || 0),
          teamName: String(team.name || ""),
          played: Number(row.playedGames || 0),
          won: Number(row.won || 0),
          draw: Number(row.draw || 0),
          lost: Number(row.lost || 0),
          goalsFor: Number(row.goalsFor || 0),
          goalsAgainst: Number(row.goalsAgainst || 0),
          points: Number(row.points || 0),
          position: Number(row.position || 0),
        };
      });
    };

    return {
      total: parseTable("TOTAL"),
      home: parseTable("HOME"),
      away: parseTable("AWAY"),
    };
  } catch {
    return { total: [], home: [], away: [] };
  }
}

type RecentForm = {
  games: number;
  gf: number;
  ga: number;
  points: number;
};

async function getTeamRecentForm(teamId: number): Promise<RecentForm> {
  try {
    const data = await fetchFootballData(`/teams/${teamId}/matches`, {
      status: "FINISHED",
      limit: "8",
    });
    const matches = (data.matches || []) as JsonRecord[];
    const finished = matches
      .filter((m) => String(m.status || "") === "FINISHED")
      .sort((a, b) => String(b.utcDate || "").localeCompare(String(a.utcDate || "")))
      .slice(0, 6);

    let gf = 0;
    let ga = 0;
    let points = 0;
    let weightSum = 0;

    finished.forEach((m, idx) => {
      const home = asRecord(m.homeTeam);
      const score = asRecord(asRecord(m.score).fullTime);
      const homeGoals = Number(score.home ?? 0);
      const awayGoals = Number(score.away ?? 0);
      const isHome = Number(home.id || 0) === teamId;
      const scored = isHome ? homeGoals : awayGoals;
      const conceded = isHome ? awayGoals : homeGoals;
      const w = Math.pow(0.85, idx);
      gf += scored * w;
      ga += conceded * w;
      weightSum += w;
      if (scored > conceded) points += 3 * w;
      else if (scored === conceded) points += 1 * w;
    });

    const games = weightSum || finished.length;
    return {
      games,
      gf: games > 0 ? gf / games : 0,
      ga: games > 0 ? ga / games : 0,
      points: games > 0 ? points / games : 0,
    };
  } catch {
    return { games: 0, gf: 0, ga: 0, points: 0 };
  }
}

export async function getPrediction(matchId: number | string) {
  try {
    const match = await getFixtureById(matchId);
    if (!match) return null;

    const [h2h, standings, homeForm, awayForm] = await Promise.all([
      fetchFootballData(`/matches/${matchId}/head2head`, { limit: "10" }).catch(
        () => null
      ),
      match.competition.code
        ? getCompetitionStandings(match.competition.code)
        : Promise.resolve({ total: [], home: [], away: [] }),
      match.homeTeam.id
        ? getTeamRecentForm(match.homeTeam.id)
        : Promise.resolve({ games: 0, gf: 0, ga: 0, points: 0 }),
      match.awayTeam.id
        ? getTeamRecentForm(match.awayTeam.id)
        : Promise.resolve({ games: 0, gf: 0, ga: 0, points: 0 }),
    ]);

    return buildPoissonPrediction(match, h2h, standings, homeForm, awayForm);
  } catch {
    return null;
  }
}

function normalizeMatches(matches: JsonRecord[]) {
  return matches
    .filter((m) =>
      ["SCHEDULED", "TIMED", "IN_PLAY", "PAUSED", "LIVE"].includes(
        String(m.status || "")
      )
    )
    .map(normalizeMatch)
    .filter((m): m is NonNullable<typeof m> => m !== null);
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

function normalizeMatch(m: JsonRecord | null) {
  if (!m) return null;
  const competition = asRecord(m.competition);
  const homeTeam = asRecord(m.homeTeam);
  const awayTeam = asRecord(m.awayTeam);
  const score = asRecord(m.score);

  return {
    id: Number(m.id),
    utcDate: String(m.utcDate || ""),
    status: String(m.status || ""),
    matchday: typeof m.matchday === "number" ? m.matchday : undefined,
    stage: m.stage ? String(m.stage) : undefined,
    competition: {
      id: (competition.id as number | string) || (competition.code as string),
      name: String(competition.name || "Competição"),
      code: competition.code ? String(competition.code) : undefined,
      emblem: (competition.emblem as string | null) || null,
    },
    homeTeam: {
      id: Number(homeTeam.id || 0),
      name: String(homeTeam.name || homeTeam.shortName || "Casa"),
      shortName: homeTeam.shortName ? String(homeTeam.shortName) : undefined,
      tla: homeTeam.tla ? String(homeTeam.tla) : undefined,
      crest: (homeTeam.crest as string | null) || null,
    },
    awayTeam: {
      id: Number(awayTeam.id || 0),
      name: String(awayTeam.name || awayTeam.shortName || "Fora"),
      shortName: awayTeam.shortName ? String(awayTeam.shortName) : undefined,
      tla: awayTeam.tla ? String(awayTeam.tla) : undefined,
      crest: (awayTeam.crest as string | null) || null,
    },
    score: {
      fullTime: asRecord(score.fullTime) as {
        home: number | null;
        away: number | null;
      },
      halfTime: asRecord(score.halfTime) as {
        home: number | null;
        away: number | null;
      },
    },
  };
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function dixonColesTau(
  homeGoals: number,
  awayGoals: number,
  lambdaHome: number,
  lambdaAway: number,
  rho = -0.08
): number {
  if (homeGoals === 0 && awayGoals === 0) {
    return 1 - lambdaHome * lambdaAway * rho;
  }
  if (homeGoals === 0 && awayGoals === 1) {
    return 1 + lambdaHome * rho;
  }
  if (homeGoals === 1 && awayGoals === 0) {
    return 1 + lambdaAway * rho;
  }
  if (homeGoals === 1 && awayGoals === 1) {
    return 1 - rho;
  }
  return 1;
}

type StandingRow = {
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

type StandingsPack = {
  total: StandingRow[];
  home: StandingRow[];
  away: StandingRow[];
};

function shrinkStrength(observed: number, played: number, prior = 1, priorGames = 6) {
  const n = Math.max(0, played);
  return (observed * n + prior * priorGames) / (n + priorGames);
}

function rowStrength(row: StandingRow | undefined, avgFor: number, avgAgainst: number) {
  if (!row || row.played <= 0) {
    return { attack: 1, defense: 1, ppg: 1 };
  }
  const rawAtk = row.goalsFor / row.played / Math.max(0.4, avgFor);
  const rawDef = row.goalsAgainst / row.played / Math.max(0.4, avgAgainst);
  return {
    attack: shrinkStrength(rawAtk, row.played),
    defense: shrinkStrength(rawDef, row.played),
    ppg: row.points / Math.max(1, row.played),
  };
}

function buildPoissonPrediction(
  match: NonNullable<ReturnType<typeof normalizeMatch>>,
  h2h: JsonRecord | null,
  standings: StandingsPack,
  homeForm: RecentForm,
  awayForm: RecentForm
) {
  const HOME_ADVANTAGE = 1.25;
  const MAX_GOALS = 6;
  const total = standings.total || [];

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

  const formBlend = (season: number, formRate: number, formGames: number, leagueAvg: number) => {
    if (formGames < 1) return season;
    const formStrength = formRate / Math.max(0.4, leagueAvg);
    const w = Math.min(0.45, 0.12 * formGames);
    return season * (1 - w) + shrinkStrength(formStrength, formGames) * w;
  };

  const homeAttack = formBlend(homeSeason.attack, homeForm.gf, homeForm.games, leagueAvgHome);
  const homeDefense = formBlend(homeSeason.defense, homeForm.ga, homeForm.games, leagueAvgAway);
  const awayAttack = formBlend(awaySeason.attack, awayForm.gf, awayForm.games, leagueAvgAway);
  const awayDefense = formBlend(awaySeason.defense, awayForm.ga, awayForm.games, leagueAvgHome);

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
      const tau = dixonColesTau(i, j, lambdaHome, lambdaAway);
      const p = base * tau;

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

  const aggregates = asRecord(h2h?.aggregates);
  if (Object.keys(aggregates).length > 0) {
    const homeAgg = asRecord(aggregates.homeTeam);
    const awayAgg = asRecord(aggregates.awayTeam);
    const n =
      Number(homeAgg.wins || 0) +
      Number(awayAgg.wins || 0) +
      Number(aggregates.draws || 0);
    if (n >= 4) {
      const h2hHome = Number(homeAgg.wins || 0) / n;
      const h2hDraw = Number(aggregates.draws || 0) / n;
      const h2hAway = Number(awayAgg.wins || 0) / n;
      const w = Math.min(0.2, 0.04 * n);
      pHome = pHome * (1 - w) + h2hHome * w;
      pDraw = pDraw * (1 - w) + h2hDraw * w;
      pAway = pAway * (1 - w) + h2hAway * w;
      const t2 = pHome + pDraw + pAway;
      pHome /= t2;
      pDraw /= t2;
      pAway /= t2;
    }
  }

  const homePct = Math.round(pHome * 100);
  const drawPct = Math.round(pDraw * 100);
  const awayPct = Math.max(0, 100 - homePct - drawPct);

  const winner: "home" | "draw" | "away" =
    homePct >= drawPct && homePct >= awayPct
      ? "home"
      : awayPct >= drawPct && awayPct >= homePct
        ? "away"
        : "draw";

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
  const confidence: "Alta" | "Média" | "Baixa" =
    sample >= 8 && edge >= 52
      ? "Alta"
      : sample >= 4 && edge >= 42
        ? "Média"
        : "Baixa";

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
    },
    h2h: Object.keys(aggregates).length ? aggregates : null,
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
    note: "Modelo Poisson + Dixon-Coles, com forças casa/fora, shrinkage no início de época, forma recente ponderada e Elo-lite (pontos/jogo). Não constitui conselho de apostas.",
  };
}
