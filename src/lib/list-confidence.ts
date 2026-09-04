import type { Match } from "@/types/api";
import type { StandingRow } from "@/lib/prediction";
import {
  scoreConfidence,
  confidenceClass,
  type ConfidenceLevel,
} from "@/lib/confidence";

export type { ConfidenceLevel };
export { confidenceClass, scoreConfidence };

export function listConfidence(
  match: Match,
  table: StandingRow[] = []
): ConfidenceLevel {
  const home = table.find((r) => r.teamId === match.homeTeam.id);
  const away = table.find((r) => r.teamId === match.awayTeam.id);
  const sample = Math.min(home?.played || 0, away?.played || 0);
  const homePpg = home && home.played > 0 ? home.points / home.played : 0;
  const awayPpg = away && away.played > 0 ? away.points / away.played : 0;
  const ppgGap = home && away ? Math.abs(homePpg - awayPpg) : 0;

  return scoreConfidence({
    sample,
    matchday: match.matchday,
    ppgGap,
  });
}
