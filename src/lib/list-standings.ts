import { asRecord, type JsonRecord, type StandingRow } from "./prediction";

const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
const FOOTBALL_DATA_KEY =
  process.env.FOOTBALL_DATA_KEY || "082eb6bed08a412387ab9b8ef0578617";

export async function fetchListStandings(code: string): Promise<StandingRow[]> {
  try {
    const url = `${FOOTBALL_DATA_BASE}/competitions/${code}/standings`;
    const res = await fetch(url, {
      headers: { "X-Auth-Token": FOOTBALL_DATA_KEY },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const tables = (data.standings || []) as JsonRecord[];
    const table = tables.find((t) => t.type === "TOTAL");
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
  } catch {
    return [];
  }
}
