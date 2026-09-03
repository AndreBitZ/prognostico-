const BASE_URL = "https://v3.football.api-sports.io";

async function fetchAPI(endpoint: string, params: Record<string, string | number> = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": process.env.API_FOOTBALL_KEY || "",
    },
    next: { revalidate: 1800 }, // cache 30 min
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export async function getFixtures(params: {
  league?: number;
  next?: number;
  date?: string;
  status?: string;
} = {}) {
  return fetchAPI("/fixtures", {
    next: params.next || 15,
    ...(params.league && { league: params.league }),
    ...(params.date && { date: params.date }),
    ...(params.status && { status: params.status }),
  });
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
