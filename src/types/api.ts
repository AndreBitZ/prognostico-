export interface Team {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string | null;
}

export interface Competition {
  id: number | string;
  name: string;
  code?: string;
  emblem?: string | null;
}

export interface Match {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number;
  stage?: string;
  competition: Competition;
  homeTeam: Team;
  awayTeam: Team;
  score?: {
    fullTime?: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
}

export interface PredictionResult {
  match: Match;
  predictions: {
    home: number;
    draw: number;
    away: number;
    winner: "home" | "draw" | "away";
    advice: string;
  };
  h2h: Record<string, unknown> | null;
  note: string;
}
