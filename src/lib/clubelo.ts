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
  "aston villa": "Aston Villa",
  "crystal palace": "Crystal Palace",
  "afc bournemouth": "Bournemouth",
  "bournemouth": "Bournemouth",
  "brentford fc": "Brentford",
  "brentford": "Brentford",
  "fulham fc": "Fulham",
  "everton fc": "Everton",
  "sunderland afc": "Sunderland",
  "burnley fc": "Burnley",
  "atletico madrid": "Atletico",
  "atletico de madrid": "Atletico",
  "club atletico de madrid": "Atletico",
  "athletic club": "Athletic",
  "athletic bilbao": "Athletic",
  "real sociedad": "Sociedad",
  "real betis": "Betis",
  "villarreal cf": "Villarreal",
  "sevilla fc": "Sevilla",
  "valencia cf": "Valencia",
  "rc celta de vigo": "Celta",
  "celta de vigo": "Celta",
  "rayo vallecano": "Vallecano",
  "getafe cf": "Getafe",
  "deportivo alaves": "Alaves",
  "rcd espanyol de barcelona": "Espanyol",
  "rcd mallorca": "Mallorca",
  "ca osasuna": "Osasuna",
  "girona fc": "Girona",
  "inter milan": "Inter",
  "fc internazionale milano": "Inter",
  "internazionale": "Inter",
  "ac milan": "Milan",
  "as roma": "Roma",
  "ss lazio": "Lazio",
  "ssc napoli": "Napoli",
  "atalanta bc": "Atalanta",
  "acf fiorentina": "Fiorentina",
  "bologna fc 1909": "Bologna",
  "torino fc": "Torino",
  "udinese calcio": "Udinese",
  "genoa cfc": "Genoa",
  "us sassuolo calcio": "Sassuolo",
  "cagliari calcio": "Cagliari",
  "hellas verona fc": "Verona",
  "us lecce": "Lecce",
  "parma calcio 1913": "Parma",
  "como 1907": "Como",
  "pisa sporting club": "Pisa",
  "bayern munich": "Bayern",
  "fc bayern munchen": "Bayern",
  "borussia dortmund": "Dortmund",
  "bayer 04 leverkusen": "Leverkusen",
  "bayer leverkusen": "Leverkusen",
  "rb leipzig": "RB Leipzig",
  "eintracht frankfurt": "Frankfurt",
  "vfb stuttgart": "Stuttgart",
  "sc freiburg": "Freiburg",
  "vfl wolfsburg": "Wolfsburg",
  "paris saint germain": "Paris SG",
  "paris saint-germain": "Paris SG",
  "psg": "Paris SG",
  "olympique de marseille": "Marseille",
  "olympique lyonnais": "Lyon",
  "as monaco fc": "Monaco",
  "lille osc": "Lille",
  "ogc nice": "Nice",
  "rc lens": "Lens",
  "stade rennais fc": "Rennes",
  "rc strasbourg alsace": "Strasbourg",
  "sporting clube de portugal": "Sporting",
  "sporting cp": "Sporting",
  "sl benfica": "Benfica",
  "fc porto": "Porto",
  "sc braga": "Braga",
  "sporting clube de braga": "Braga",
  "vitoria sc": "Guimaraes",
  "vitoria de guimaraes": "Guimaraes",
  "vitoria guimaraes": "Guimaraes",
  "gd estoril praia": "Estoril",
  "estoril praia": "Estoril",
  "fc famalicao": "Famalicao",
  "famalicao": "Famalicao",
  "casa pia ac": "Casa Pia",
  "rio ave fc": "Rio Ave",
  "moreirense fc": "Moreirense",
  "fc arouca": "Arouca",
  "gil vicente fc": "Gil Vicente",
  "cd nacional": "Nacional",
  "cd santa clara": "Santa Clara",
  "avs futebol sad": "AVS",
  "fc alverca": "Alverca",
  "cd tondela": "Tondela",
  "cf estrela da amadora": "Estrela",
  "ajax": "Ajax",
  "psv": "PSV",
  "psv eindhoven": "PSV",
  "feyenoord": "Feyenoord",
  "feyenoord rotterdam": "Feyenoord",
  "az alkmaar": "AZ",
  "az": "AZ",
  "fc twente": "Twente",
  "fc utrecht": "Utrecht",
  "club brugge": "Club Brugge",
  "club brugge kv": "Club Brugge",
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

export const getClubEloTable = unstable_cache(downloadTable, ["clubelo-table-v2"], {
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
