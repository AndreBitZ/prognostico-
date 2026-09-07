import type { RecentForm, RecentMatch } from "./prediction";

const RAW =
  "https://raw.githubusercontent.com/openfootball/football.json/master";

const FILES: Record<string, string> = {
  PL: "en.1.json",
  ELC: "en.2.json",
  PD: "es.1.json",
  SA: "it.1.json",
  BL1: "de.1.json",
  FL1: "fr.1.json",
  PPL: "pt.1.json",
  DED: "nl.1.json",
};

type OFMatch = {
  date?: string;
  team1?: string;
  team2?: string;
  score?: { ft?: [number, number] | number[] };
};

function seasonFolder() {
  const now = new Date();
  const y = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${y}-${String(y + 1).slice(-2)}`;
}

function prevSeasonFolder() {
  const now = new Date();
  const y = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${y - 1}-${String(y).slice(-2)}`;
}

function norm(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(
      /\b(fc|cf|sc|ac|cd|sad|ssc|gd|sl|sporting|clube|futebol|the|de|da|do|united|utd|city)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function similar(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const as = new Set(a.split(" ").filter((w) => w.length > 2));
  const bs = new Set(b.split(" ").filter((w) => w.length > 2));
  let hit = 0;
  as.forEach((w) => {
    if (bs.has(w)) hit += 1;
  });
  return hit >= 1;
}

function matchKey(m: RecentMatch) {
  return `${m.utcDate.slice(0, 10)}-${m.isHome ? "h" : "a"}-${m.scored}-${m.conceded}`;
}

function ratesFromMatches(parsed: RecentMatch[]): RecentForm {
  let gf = 0;
  let ga = 0;
  let points = 0;
  let wSum = 0;
  parsed.forEach((m, idx) => {
    const w = Math.pow(0.85, idx);
    gf += m.scored * w;
    ga += m.conceded * w;
    wSum += w;
    if (m.scored > m.conceded) points += 3 * w;
    else if (m.scored === m.conceded) points += 1 * w;
  });
  const games = wSum || parsed.length;
  return {
    games,
    gf: games > 0 ? gf / games : 0,
    ga: games > 0 ? ga / games : 0,
    points: games > 0 ? points / games : 0,
    matches: parsed,
  };
}

async function loadSeason(file: string, folder: string): Promise<OFMatch[]> {
  const url = `${RAW}/${folder}/${file}`;
  const res = await fetch(url, { next: { revalidate: 21600 } });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.matches) ? (data.matches as OFMatch[]) : [];
}

export async function getOpenFootballMatches(code?: string | null): Promise<OFMatch[]> {
  const file = code ? FILES[code.toUpperCase()] : undefined;
  if (!file) return [];
  try {
    const current = await loadSeason(file, seasonFolder());
    if (current.length) return current;
    return await loadSeason(file, prevSeasonFolder());
  } catch {
    return [];
  }
}

export function formFromOpenFootball(matches: OFMatch[], teamName: string): RecentForm {
  const n = norm(teamName);
  const finished = matches
    .filter((m) => Array.isArray(m.score?.ft) && m.score!.ft!.length >= 2 && m.date)
    .filter((m) => similar(n, norm(m.team1 || "")) || similar(n, norm(m.team2 || "")))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 10);

  const parsed: RecentMatch[] = finished.map((m) => {
    const isHome = similar(n, norm(m.team1 || ""));
    const ft = m.score!.ft!;
    return {
      opponentId: 0,
      isHome,
      scored: Number(isHome ? ft[0] : ft[1]),
      conceded: Number(isHome ? ft[1] : ft[0]),
      utcDate: `${m.date}T12:00:00Z`,
    };
  });
  return ratesFromMatches(parsed);
}

/** Football-Data.org continua a ser a base. O JSON só acrescenta jogos que faltem. */
export function preferForm(primary: RecentForm, extra: RecentForm): RecentForm {
  const seen = new Set((primary.matches || []).map(matchKey));
  const filled = (extra.matches || []).filter((m) => !seen.has(matchKey(m)));
  if (!filled.length) return primary;
  const merged = [...(primary.matches || []), ...filled]
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .slice(0, 8);
  return ratesFromMatches(merged);
}
