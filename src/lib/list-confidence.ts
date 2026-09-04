import type { Match } from "@/types/api";
import {
  buildPoissonPrediction,
  type RecentForm,
  type StandingRow,
} from "@/lib/prediction";
import { confidenceClass, type ConfidenceLevel } from "@/lib/confidence";

export type { ConfidenceLevel };
export { confidenceClass };

const EMPTY_FORM: RecentForm = {
  games: 0,
  gf: 0,
  ga: 0,
  points: 0,
  matches: [],
};

export function listConfidence(
  match: Match,
  table: StandingRow[] = []
): ConfidenceLevel {
  const prediction = buildPoissonPrediction(
    match,
    null,
    { total: table, home: [], away: [] },
    EMPTY_FORM,
    EMPTY_FORM,
    null
  );
  return prediction.predictions.confidence;
}
