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

export async function getPrediction(matchId: number | string) {
  try {
    const match = await getFixtureById(matchId);
    if (!match) return null;

    let h2h: JsonRecord | null = null;
    try {
      h2h = await fetchFootballData(`/matches/${matchId}/head2head`, {
        limit: "10",
      });
    } catch {
      h2h = null;
    }

    return buildSimplePrediction(match, h2h);
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
    .filter(Boolean);
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

function buildSimplePrediction(
  match: NonNullable<ReturnType<typeof normalizeMatch>>,
  h2h: JsonRecord | null
) {
  let home = 40;
  let draw = 28;
  let away = 32;

  const aggregates = asRecord(h2h?.aggregates);
  if (Object.keys(aggregates).length > 0) {
    const homeAgg = asRecord(aggregates.homeTeam);
    const awayAgg = asRecord(aggregates.awayTeam);
    const total =
      Number(homeAgg.wins || 0) +
      Number(awayAgg.wins || 0) +
      Number(aggregates.draws || 0);
    if (total > 0) {
      const hw = (Number(homeAgg.wins || 0) / total) * 100;
      const aw = (Number(awayAgg.wins || 0) / total) * 100;
      const dr = (Number(aggregates.draws || 0) / total) * 100;
      home = Math.round(hw * 0.6 + 40 * 0.4);
      away = Math.round(aw * 0.6 + 32 * 0.4);
      draw = Math.round(dr * 0.6 + 28 * 0.4);
    }
  }

  const sum = home + draw + away;
  home = Math.round((home / sum) * 100);
  draw = Math.round((draw / sum) * 100);
  away = 100 - home - draw;

  const winner =
    home >= draw && home >= away
      ? "home"
      : away >= draw && away >= home
        ? "away"
        : "draw";

  const advice =
    winner === "home"
      ? `Vitória ${match.homeTeam.name}`
      : winner === "away"
        ? `Vitória ${match.awayTeam.name}`
        : "Empate";

  return {
    match,
    predictions: {
      home,
      draw,
      away,
      winner,
      advice,
    },
    h2h: aggregates || null,
    note: "Prognóstico estatístico simples baseado em vantagem de casa e confrontos diretos (quando disponíveis). Não constitui conselho de apostas.",
  };
}
