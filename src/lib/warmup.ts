import { getClubEloTable } from "./clubelo";
import { getOpenFootballMatches } from "./football-json";

const OF_CODES = ["PL", "ELC", "PD", "SA", "BL1", "FL1", "PPL", "DED"];

export async function warmupComplements() {
  const elo = await getClubEloTable().catch(() => []);
  const ofCounts: Record<string, number> = {};
  await Promise.all(
    OF_CODES.map(async (code) => {
      const rows = await getOpenFootballMatches(code).catch(() => []);
      ofCounts[code] = rows.length;
    })
  );
  return {
    elo: elo.length,
    footballJson: ofCounts,
    at: new Date().toISOString(),
  };
}
