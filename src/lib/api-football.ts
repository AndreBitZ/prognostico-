const BASE_URL = "https://v3.football.api-sports.io";

// Fallback hardcoded key (para funcionar só com o GitHub, sem precisar configurar no Vercel)
const API_KEY = process.env.API_FOOTBALL_KEY || "d20b70cc773274969545341b67008f67";

async function fetchAPI(endpoint: string, params: Record<string, string | number> = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": API_KEY,
    },
    next: { revalidate: 1800 }, // cache 30 min
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

function getDateString(daysFromNow = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

export async function getFixtures(params: {
  league?: number;
  next?: number;
  date?: string;
  status?: string;
} = {}) {
  // Free plan does not support "next" parameter.
  // We fetch by date (today + next 2 days) instead.
  if (params.league) {
    // When a league is selected, try today first, then tomorrow
    const dates = [getDateString(0), getDateString(1), getDateString(2)];
    const allMatches: any[] = [];

    for (const date of dates) {
      const data = await fetchAPI("/fixtures", {
        league: params.league,
        date,
      });
      if (data?.response?.length) {
        allMatches.push(...data.response);
      }
    }

    return { response: allMatches, results: allMatches.length };
  }

  // No league filter → get fixtures for today + next 2 days
  const dates = [getDateString(0), getDateString(1), getDateString(2)];
  const allMatches: any[] = [];

  for (const date of dates) {
    const data = await fetchAPI("/fixtures", { date });
    if (data?.response?.length) {
      // Prefer not-started or live matches
      const relevant = data.response.filter(
        (m: any) => !["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"].includes(m.fixture.status.short)
      );
      allMatches.push(...relevant);
    }
  }

  // Limit to reasonable number
  const limited = allMatches.slice(0, params.next || 30);

  return { response: limited, results: limited.length };
}

export async function getPrediction(fixtureId: number) {
  return fetchAPI("/predictions", { fixture: fixtureId });
}

export async function getFixtureById(fixtureId: number) {
  return fetchAPI("/fixtures", { id: fixtureId });
}

// Ligas principais para o filtro
export const MAIN_LEAGUES = [
  { id: 39, name: "Premier League", country: "Inglaterra" },
  { id: 140, name: "La Liga", country: "Espanha" },
  { id: 135, name: "Serie A", country: "Itália" },
  { id: 78, name: "Bundesliga", country: "Alemanha" },
  { id: 61, name: "Ligue 1", country: "França" },
  { id: 2, name: "Champions League", country: "Europa" },
  { id: 3, name: "Europa League", country: "Europa" },
  { id: 94, name: "Primeira Liga", country: "Portugal" },
  { id: 71, name: "Brasileirão", country: "Brasil" },
];
