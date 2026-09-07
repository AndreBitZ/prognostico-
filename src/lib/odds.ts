const ODDS_API_KEY =
  process.env.ODDS_API_KEY || "f3308789dff38e8bfffd6339acd94122";
const ODDS_BASE = "https://api.the-odds-api.com/v4";

/** Chaves The Odds API para as ligas do football-data.org usadas na app. */
export const ODDS_LEAGUES: Record<string, string> = {
  PL: "soccer_epl",
  PD: "soccer_spain_la_liga",
  SA: "soccer_italy_serie_a",
  BL1: "soccer_germany_bundesliga",
  FL1: "soccer_france_ligue_one",
  CL: "soccer_uefa_champs_league",
  PPL: "soccer_portugal_primeira_liga",
  DED: "soccer_netherlands_eredivisie",
  BSA: "soccer_brazil_campeonato",
};

export type MarketOdds = {
  home: number;
  draw: number;
  away: number;
  homeOdd: number;
  drawOdd: number;
  awayOdd: number;
  books: number;
  source: string;
};

type OddsEvent = {
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers?: {
    title?: string;
    markets?: {
      key: string;
      outcomes?: { name: string; price: number }[];
    }[];
  }[];
};

function norm(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(
      /\b(fc|cf|sc|ac|cd|sad|ssc|ss|as|ud|rc|us|sv|tsg|bsc|vfl|vfb|united|utd|city|sporting|club|de|da|do|the|calcio)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

const ALIASES: Record<string, string> = {
  "sporting cp": "sporting lisbon",
  "sporting clube de portugal": "sporting lisbon",
  "sl benfica": "benfica",
  "sport lisboa e benfica": "benfica",
  "fc porto": "porto",
  "futebol clube do porto": "porto",
  "vitoria sc": "vitoria guimaraes",
  "vitoria de guimaraes": "vitoria guimaraes",
  "moreirense fc": "moreirense",
  "gil vicente": "gil vicente",
  "casa pia": "casa pia",
  "santa clara": "santa clara",
  "man utd": "manchester united",
  "man city": "manchester city",
  "spurs": "tottenham",
  "wolves": "wolverhampton",
  "nottm forest": "nottingham forest",
  "nottingham forest": "nottingham forest",
  "west ham": "west ham",
  "brighton": "brighton",
  "newcastle": "newcastle",
  "atletico madrid": "atletico madrid",
  "atletico de madrid": "atletico madrid",
  "athletic club": "athletic bilbao",
  "athletic bilbao": "athletic bilbao",
  "real sociedad": "real sociedad",
  "inter": "inter milan",
  "internazionale": "inter milan",
  "fc internazionale milano": "inter milan",
  "ac milan": "milan",
  "as roma": "roma",
  "ss lazio": "lazio",
  "juventus": "juventus",
  "napoli": "napoli",
  "bayern munich": "bayern munich",
  "fc bayern munchen": "bayern munich",
  "fc bayern munich": "bayern munich",
  "borussia dortmund": "dortmund",
  "bayer leverkusen": "bayer leverkusen",
  "rb leipzig": "leipzig",
  "eintracht frankfurt": "eintracht frankfurt",
  "paris saint germain": "paris saint germain",
  "paris saint-germain": "paris saint germain",
  "psg": "paris saint germain",
  "olympique marseille": "marseille",
  "olympique lyonnais": "lyon",
  "as monaco": "monaco",
  "lille osc": "lille",
  "ajax": "ajax",
  "psv": "psv eindhoven",
  "psv eindhoven": "psv eindhoven",
  "feyenoord": "feyenoord",
  "flamengo": "flamengo",
  "se palmeiras": "palmeiras",
  "sao paulo": "sao paulo",
  "corinthians": "corinthians",
  "fluminense": "fluminense",
  "gremio": "gremio",
  "internacional": "internacional",
  "botafogo": "botafogo",
  "cruzeiro": "cruzeiro",
  "atletico mineiro": "atletico mineiro",
};

function alias(name: string) {
  const n = name.toLowerCase().trim();
  return norm(ALIASES[n] || name);
}

function similar(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const as = new Set(a.split(" "));
  const bs = new Set(b.split(" "));
  let hit = 0;
  as.forEach((w) => {
    if (w.length > 2 && bs.has(w)) hit += 1;
  });
  return hit >= 1 && Math.min(as.size, bs.size) <= 3;
}

async function fetchLeagueOdds(sportKey: string): Promise<OddsEvent[]> {
  if (!ODDS_API_KEY) return [];
  const url = `${ODDS_BASE}/sports/${sportKey}/odds?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${ODDS_API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as OddsEvent[]) : [];
}

function impliedFromEvent(event: OddsEvent): MarketOdds | null {
  const homes: number[] = [];
  const draws: number[] = [];
  const aways: number[] = [];

  (event.bookmakers || []).forEach((book) => {
    const market = (book.markets || []).find((m) => m.key === "h2h");
    if (!market?.outcomes) return;
    const byName = new Map(
      market.outcomes.map((o) => [o.name.toLowerCase(), o.price])
    );
    const homeOdd = byName.get(event.home_team.toLowerCase());
    const awayOdd = byName.get(event.away_team.toLowerCase());
    const drawOdd =
      byName.get("draw") || byName.get("tie") || byName.get("empate");
    if (!homeOdd || !awayOdd || !drawOdd) return;
    const rawH = 1 / homeOdd;
    const rawD = 1 / drawOdd;
    const rawA = 1 / awayOdd;
    const s = rawH + rawD + rawA;
    if (s <= 0) return;
    homes.push(rawH / s);
    draws.push(rawD / s);
    aways.push(rawA / s);
  });

  if (!homes.length) return null;
  const avg = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / arr.length;
  const home = avg(homes);
  const draw = avg(draws);
  const away = avg(aways);
  return {
    home,
    draw,
    away,
    homeOdd: Math.round((1 / home) * 100) / 100,
    drawOdd: Math.round((1 / draw) * 100) / 100,
    awayOdd: Math.round((1 / away) * 100) / 100,
    books: homes.length,
    source: "The Odds API",
  };
}

export async function getMarketOddsForMatch(options: {
  competitionCode?: string;
  homeName: string;
  awayName: string;
  utcDate: string;
}): Promise<MarketOdds | null> {
  const sportKey = options.competitionCode
    ? ODDS_LEAGUES[options.competitionCode]
    : undefined;
  if (!sportKey || !ODDS_API_KEY) return null;

  try {
    const events = await fetchLeagueOdds(sportKey);
    const home = alias(options.homeName);
    const away = alias(options.awayName);
    const kick = Date.parse(options.utcDate);

    let best: OddsEvent | null = null;
    let bestScore = 0;
    events.forEach((ev) => {
      const eh = alias(ev.home_team);
      const ea = alias(ev.away_team);
      const homeOk = similar(home, eh);
      const awayOk = similar(away, ea);
      if (!homeOk || !awayOk) return;
      const t = Date.parse(ev.commence_time);
      const timeOk =
        Number.isFinite(kick) && Number.isFinite(t)
          ? Math.abs(kick - t) < 1000 * 60 * 60 * 36
          : true;
      const score = (homeOk ? 2 : 0) + (awayOk ? 2 : 0) + (timeOk ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = ev;
      }
    });
    if (!best) return null;
    return impliedFromEvent(best);
  } catch {
    return null;
  }
}
