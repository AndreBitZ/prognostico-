export type TeamXG = {
  name: string;
  played: number;
  xgf: number;
  xga: number;
  npxgf: number;
  npxga: number;
};

const UNDERSTAT_LEAGUES: Record<string, string> = {
  PL: "EPL",
  PD: "La_liga",
  SA: "Serie_A",
  BL1: "Bundesliga",
  FL1: "Ligue_1",
};

function seasonYear() {
  const now = new Date();
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

function decodeJsString(raw: string) {
  return raw
    .replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ");
}

function extractTeamsData(html: string): Record<string, unknown> | null {
  const markers = ["teamsData", "datesData"];
  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx < 0) continue;
    const slice = html.slice(idx, idx + 400000);
    const m =
      slice.match(/JSON\.parse\('([\s\S]*?)'\)/) ||
      slice.match(/JSON\.parse\("([\s\S]*?)"\)/);
    if (!m?.[1]) continue;
    try {
      const parsed = JSON.parse(decodeJsString(m[1]));
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
}

function norm(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  return hit >= 1;
}

type HistoryRow = {
  xG?: number;
  xGA?: number;
  npxG?: number;
  npxGA?: number;
};

function toTeam(entry: unknown): TeamXG | null {
  if (!entry || typeof entry !== "object") return null;
  const rec = entry as { title?: string; history?: HistoryRow[] };
  const history = Array.isArray(rec.history) ? rec.history : [];
  if (!rec.title || history.length < 3) return null;
  const last = history.slice(-10);
  const played = last.length;
  const sum = (key: keyof HistoryRow) =>
    last.reduce((s, r) => s + Number(r[key] || 0), 0);
  return {
    name: rec.title,
    played,
    xgf: sum("xG") / played,
    xga: sum("xGA") / played,
    npxgf: sum("npxG") / played,
    npxga: sum("npxGA") / played,
  };
}

async function fetchUnderstatLeague(slug: string, year: number): Promise<TeamXG[]> {
  const url = `https://understat.com/league/${slug}/${year}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 PrognosticoXG/1.0",
      Accept: "text/html",
    },
    next: { revalidate: 43200 },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const data = extractTeamsData(html);
  if (!data) return [];
  return Object.values(data)
    .map(toTeam)
    .filter((t): t is TeamXG => t !== null);
}

export async function getLeagueXG(code?: string | null): Promise<TeamXG[]> {
  const slug = code ? UNDERSTAT_LEAGUES[code.toUpperCase()] : undefined;
  if (!slug) return [];
  const year = seasonYear();
  try {
    const current = await fetchUnderstatLeague(slug, year);
    if (current.length) return current;
    return await fetchUnderstatLeague(slug, year - 1);
  } catch {
    return [];
  }
}

export function matchTeamXG(teams: TeamXG[], name: string): TeamXG | null {
  const n = norm(name);
  let best: TeamXG | null = null;
  for (const t of teams) {
    if (similar(n, norm(t.name))) {
      best = t;
      if (norm(t.name) === n) return t;
    }
  }
  return best;
}

export function leagueXGAverages(teams: TeamXG[]) {
  if (!teams.length) return { for: 1.35, against: 1.35 };
  const f = teams.reduce((s, t) => s + t.npxgf, 0) / teams.length;
  const a = teams.reduce((s, t) => s + t.npxga, 0) / teams.length;
  return { for: Math.max(0.6, f), against: Math.max(0.6, a) };
}
