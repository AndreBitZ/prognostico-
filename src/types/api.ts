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
    expectedGoals: { home: number; away: number };
    over25: number;
    btts: number;
    topScores: { score: string; percent: number }[];
    confidence: "Alta" | "Média" | "Baixa";
    value?: boolean;
    votes?: {
      poisson: "home" | "draw" | "away";
      pi: "home" | "draw" | "away";
      bradleyTerry: "home" | "draw" | "away";
    };
  };
  market?: {
    home: number;
    draw: number;
    away: number;
    homeOdd: number;
    drawOdd: number;
    awayOdd: number;
    books: number;
    agrees: boolean;
    value?: boolean;
    edge?: number;
  } | null;
  h2h: Record<string, unknown> | null;
  standingsContext?: {
    home: {
      position: number;
      points: number;
      gf: number;
      ga: number;
      played: number;
    } | null;
    away: {
      position: number;
      points: number;
      gf: number;
      ga: number;
      played: number;
    } | null;
  };
  note: string;
}
