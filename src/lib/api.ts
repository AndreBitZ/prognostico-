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
    const total = tables.find((t) => t.type === "TOTAL");
    return ((total?.table as JsonRecord[]) || []).map((row) => {
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
  } catch {
    return [];
  }
}

export async function getPrediction(matchId: number | string) {
  try {
    const match = await getFixtureById(matchId);
    if (!match) return null;

    const [h2h, standings] = await Promise.all([
      fetchFootballData(`/matches/${matchId}/head2head`, { limit: "10" }).catch(
        () => null
      ),
      match.competition.code
        ? getCompetitionStandings(match.competition.code)
        : Promise.resolve([]),
    ]);

    return buildPoissonPrediction(match, h2h, standings);
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
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  position: number;
};

function buildPoissonPrediction(
  match: NonNullable<ReturnType<typeof normalizeMatch>>,
  h2h: JsonRecord | null,
  standings: StandingRow[]
) {
  const HOME_ADVANTAGE = 1.28;
  const LEAGUE_AVG_HOME = 1.45;
  const LEAGUE_AVG_AWAY = 1.15;
  const MAX_GOALS = 6;

  let leagueAvgHome = LEAGUE_AVG_HOME;
  let leagueAvgAway = LEAGUE_AVG_AWAY;
  if (standings.length > 0) {
    const sumPlayed = standings.reduce((s, r) => s + r.played, 0);
    const totalGF = standings.reduce((s, r) => s + r.goalsFor, 0);
    if (sumPlayed > 0) {
      const avgPerTeam = totalGF / sumPlayed;
      leagueAvgHome = Math.max(0.8, avgPerTeam * 1.15);
      leagueAvgAway = Math.max(0.6, avgPerTeam * 0.85);
    }
  }

  const homeRow = standings.find((r) => r.teamId === match.homeTeam.id);
  const awayRow = standings.find((r) => r.teamId === match.awayTeam.id);

  const homeAttack =
    homeRow && homeRow.played > 0
      ? homeRow.goalsFor / homeRow.played / leagueAvgHome
      : 1;
  const homeDefense =
    homeRow && homeRow.played > 0
      ? homeRow.goalsAgainst / homeRow.played / leagueAvgAway
      : 1;
  const awayAttack =
    awayRow && awayRow.played > 0
      ? awayRow.goalsFor / awayRow.played / leagueAvgAway
      : 1;
  const awayDefense =
    awayRow && awayRow.played > 0
      ? awayRow.goalsAgainst / awayRow.played / leagueAvgHome
      : 1;

  let lambdaHome = homeAttack * awayDefense * leagueAvgHome * HOME_ADVANTAGE;
  let lambdaAway = awayAttack * homeDefense * leagueAvgAway;

  lambdaHome = Math.min(3.8, Math.max(0.35, lambdaHome));
  lambdaAway = Math.min(3.4, Math.max(0.25, lambdaAway));

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

  const total = pHome + pDraw + pAway;
  pHome /= total;
  pDraw /= total;
  pAway /= total;
  pOver25 = Math.min(0.95, pOver25 / total);
  pBtts = Math.min(0.95, pBtts / total);

  const aggregates = asRecord(h2h?.aggregates);
  if (Object.keys(aggregates).length > 0) {
    const homeAgg = asRecord(aggregates.homeTeam);
    const awayAgg = asRecord(aggregates.awayTeam);
    const n =
      Number(homeAgg.wins || 0) +
      Number(awayAgg.wins || 0) +
      Number(aggregates.draws || 0);
    if (n >= 3) {
      const h2hHome = Number(homeAgg.wins || 0) / n;
      const h2hDraw = Number(aggregates.draws || 0) / n;
      const h2hAway = Number(awayAgg.wins || 0) / n;
      const w = 0.25;
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

  const winner =
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
    percent: Math.round((s.prob / total) * 1000) / 10,
  }));

  const confidence =
    Math.max(homePct, drawPct, awayPct) >= 55
      ? ("Alta" as const)
      : Math.max(homePct, drawPct, awayPct) >= 42
        ? ("Média" as const)
        : ("Baixa" as const);

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
      home: homeRow
        ? {
            position: homeRow.position,
            points: homeRow.points,
            gf: homeRow.goalsFor,
            ga: homeRow.goalsAgainst,
            played: homeRow.played,
          }
        : null,
      away: awayRow
        ? {
            position: awayRow.position,
            points: awayRow.points,
            gf: awayRow.goalsFor,
            ga: awayRow.goalsAgainst,
            played: awayRow.played,
          }
        : null,
    },
    note: "Modelo Poisson com forças de ataque/defesa (classificação), vantagem de casa e correção Dixon-Coles. Blend opcional com confrontos diretos. Não constitui conselho de apostas.",
  };
}
