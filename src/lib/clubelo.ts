import { unstable_cache } from "next/cache";

const BASE = "https://api.clubelo.com";

export type ClubEloRow = {
  rank: number | null;
  club: string;
  country: string;
  level: string;
  elo: number;
};

const KEEP_COUNTRY = new Set([
  "ENG",
  "ESP",
  "ITA",
  "GER",
  "FRA",
  "POR",
  "NED",
  "BEL",
  "BRA",
  "SCO",
  "TUR",
]);

const ALIAS: Record<string, string> = {
  "manchester city": "Man City",
  "man city": "Man City",
  "manchester united": "Man United",
  "man united": "Man United",
  "tottenham hotspur": "Tottenham",
  "wolverhampton wanderers": "Wolves",
  "nottingham forest": "Forest",
  "brighton and hove albion": "Brighton",
  "brighton & hove albion": "Brighton",
  "west ham united": "West Ham",
  "newcastle united": "Newcastle",
  "leicester city": "Leicester",
  "leeds united": "Leeds",
  "sheffield united": "Sheffield United",
  "atletico madrid": "Atletico",
  "atlético de madrid": "Atletico",
  "athletic club": "Athletic",
  "athletic bilbao": "Athletic",
  "real sociedad": "Sociedad",
  "inter milan": "Inter",
  "fc internazionale milano": "Inter",
  "internazionale": "Inter",
  "ac milan": "Milan",
  "as roma": "Roma",
  "ss lazio": "Lazio",
  "juventus": "Juventus",
  "bayern munich": "Bayern",
  "fc bayern münchen": "Bayern",
  "borussia dortmund": "Dortmund",
  "bayer 04 leverkusen": "Leverkusen",
  "bayer leverkusen": "Leverkusen",
  "rb leipzig": "RB Leipzig",
  "paris saint germain": "Paris SG",
  "paris saint-germain": "Paris SG",
  "psg": "Paris SG",
  "olympique de marseille": "Marseille",
  "olympique lyonnais": "Lyon",
  "sporting clube de portugal": "Sporting",
  "sporting cp": "Sporting",
  "sl benfica": "Benfica",
  "fc porto": "Porto",
  "sc braga": "Braga",
  "ajax": "Ajax",
  "psv": "PSV",
  "feyenoord": "Feyenoord",
  "club brugge": "Club Brugge",
};

function norm(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function parseCsv(text: string): ClubEloRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const rows: ClubEloRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 5) continue;
    const country = (cols[2] || "").trim().toUpperCase();
    if (KEEP_COUNTRY.size && country && !KEEP_COUNTRY.has(country)) continue;
    const elo = Number(cols[4]);
    if (!Number.isFinite(elo)) continue;
    const rank = Number(cols[0]);
    rows.push({
      rank: Number.isFinite(rank) ? rank : null,
      club: cols[1].trim(),
      country,
      level: cols[3].trim(),
      elo,
    });
  }
  return rows;
}

async function downloadTable(): Promise<ClubEloRow[]> {
  const dates = [todayUtc()];
  const y = new Date();
  y.setUTCDate(y.getUTCDate() - 1);
  dates.push(y.toISOString().slice(0, 10));

  for (const date of dates) {
    try {
      const res = await fetch(`${BASE}/${date}`, {
        next: { revalidate: 86400 },
        headers: { Accept: "text/csv,text/plain,*/*" },
      });
      if (!res.ok) continue;
      const rows = parseCsv(await res.text());
      if (rows.length) return rows;
    } catch {
      /* tenta o dia seguinte */
    }
  }
  return [];
}

export const getClubEloTable = unstable_cache(downloadTable, ["clubelo-table-v1"], {
  revalidate: 86400,
});

export function matchClubElo(table: ClubEloRow[], teamName: string): ClubEloRow | null {
  if (!table.length || !teamName) return null;
  const raw = norm(teamName);
  const alias = ALIAS[raw];
  if (alias) {
    const hit = table.find((r) => r.club === alias || norm(r.club) === norm(alias));
    if (hit) return hit;
  }
  const exact = table.find((r) => norm(r.club) === raw);
  if (exact) return exact;
  const contains = table.find(
    (r) => norm(r.club).includes(raw) || raw.includes(norm(r.club))
  );
  if (contains) return contains;
  const tokens = raw.split(" ").filter((w) => w.length > 3);
  if (!tokens.length) return null;
  return (
    table.find((r) => {
      const n = norm(r.club);
      return tokens.every((t) => n.includes(t));
    }) || null
  );
}
