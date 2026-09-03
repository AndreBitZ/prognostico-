import { Match } from "@/types/api";
import { StandingRow } from "@/lib/prediction";

export type ConfidenceLevel = "Alta" | "Média" | "Baixa";

export function listConfidence(
  match: Match,
  table: StandingRow[] = []
): ConfidenceLevel {
  const home = table.find((r) => r.teamId === match.homeTeam.id);
  const away = table.find((r) => r.teamId === match.awayTeam.id);
  const sample = Math.min(home?.played || 0, away?.played || 0);
  const homePpg = home && home.played > 0 ? home.points / home.played : 1.3;
  const awayPpg = away && away.played > 0 ? away.points / away.played : 1.1;
  const gap = Math.abs(homePpg - awayPpg);
  const matchday = match.matchday || 99;

  if (matchday <= 6 || sample < 4) return "Baixa";
  if (sample >= 8 && gap >= 0.65) return "Alta";
  if (sample >= 4 && gap >= 0.3) return "Média";
  return "Baixa";
}

export function confidenceClass(level: ConfidenceLevel) {
  if (level === "Alta") return "bg-emerald-100 text-emerald-800";
  if (level === "Média") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}
