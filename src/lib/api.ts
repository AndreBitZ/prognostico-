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
