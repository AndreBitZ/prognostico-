import {
  asRecord,
  buildPoissonPrediction,
  type JsonRecord,
  type RecentForm,
  type RecentMatch,
  type StandingRow,
} from "./prediction";
import { getMarketOddsForMatch } from "./odds";

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

async function getTeamRecentForm(teamId: number): Promise<RecentForm> {
  try {
    const data = await fetchFootballData(`/teams/${teamId}/matches`, {
      status: "FINISHED",
      limit: "10",
    });
    const matches = (data.matches || []) as JsonRecord[];
    const finished = matches
      .filter((m) => String(m.status || "") === "FINISHED")
      .sort((a, b) => String(b.utcDate || "").localeCompare(String(a.utcDate || "")))
      .slice(0, 8);

    const parsed: RecentMatch[] = finished.map((m) => {
      const home = asRecord(m.homeTeam);
      const away = asRecord(m.awayTeam);
      const score = asRecord(asRecord(m.score).fullTime);
      const homeGoals = Number(score.home ?? 0);
      const awayGoals = Number(score.away ?? 0);
      const isHome = Number(home.id || 0) === teamId;
      return {
        opponentId: isHome ? Number(away.id || 0) : Number(home.id || 0),
        isHome,
        scored: isHome ? homeGoals : awayGoals,
        conceded: isHome ? awayGoals : homeGoals,
        utcDate: String(m.utcDate || ""),
      };
    });

    let gf = 0;
    let ga = 0;
    let points = 0;
    let weightSum = 0;
    parsed.forEach((m, idx) => {
      const w = Math.pow(0.85, idx);
      gf += m.scored * w;
      ga += m.conceded * w;
      weightSum += w;
      if (m.scored > m.conceded) points += 3 * w;
      else if (m.scored === m.conceded) points += 1 * w;
    });
    const games = weightSum || parsed.length;
    return {
      games,
      gf: games > 0 ? gf / games : 0,
      ga: games > 0 ? ga / games : 0,
      points: games > 0 ? points / games : 0,
      matches: parsed,
    };
  } catch {
    return { games: 0, gf: 0, ga: 0, points: 0, matches: [] };
  }
}

const EMPTY_FORM: RecentForm = {
  games: 0,
  gf: 0,
  ga: 0,
  points: 0,
  matches: [],
};

export async function getPrediction(matchId: number | string) {
  try {
    const match = await getFixtureById(matchId);
    if (!match) return null;

    const [h2h, standings, homeForm, awayForm, market] = await Promise.all([
      fetchFootballData(`/matches/${matchId}/head2head`, { limit: "10" }).catch(
        () => null
      ),
      match.competition.code
        ? getCompetitionStandings(match.competition.code)
        : Promise.resolve({ total: [], home: [], away: [] }),
      match.homeTeam.id ? getTeamRecentForm(match.homeTeam.id) : Promise.resolve(EMPTY_FORM),
      match.awayTeam.id ? getTeamRecentForm(match.awayTeam.id) : Promise.resolve(EMPTY_FORM),
      getMarketOddsForMatch({
        competitionCode: match.competition.code,
        homeName: match.homeTeam.name,
        awayName: match.awayTeam.name,
        utcDate: match.utcDate,
      }),
    ]);

    return buildPoissonPrediction(match, h2h, standings, homeForm, awayForm, market);
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
