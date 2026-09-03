export interface Team {
  id: number;
  name: string;
  logo: string;
}

export interface League {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag?: string;
  season: number;
  round?: string;
}

export interface Fixture {
  id: number;
  referee: string | null;
  timezone: string;
  date: string;
  timestamp: number;
  status: {
    long: string;
    short: string;
    elapsed: number | null;
  };
  venue: {
    id: number | null;
    name: string | null;
    city: string | null;
  };
}

export interface Goals {
  home: number | null;
  away: number | null;
}

export interface Score {
  halftime: Goals;
  fulltime: Goals;
  extratime: Goals | null;
  penalty: Goals | null;
}

export interface FixtureItem {
  fixture: Fixture;
  league: League;
  teams: {
    home: Team & { winner: boolean | null };
    away: Team & { winner: boolean | null };
  };
  goals: Goals;
  score: Score;
}

export interface PredictionPercent {
  home: string;
  draw: string;
  away: string;
}

export interface PredictionWinner {
  id: number | null;
  name: string | null;
  comment: string | null;
}

export interface Prediction {
  winner: PredictionWinner;
  win_or_draw: boolean;
  under_over: string | null;
  goals: {
    home: string | null;
    away: string | null;
  };
  advice: string;
  percent: PredictionPercent;
}

export interface PredictionComparison {
  form: { home: string; away: string };
  att: { home: string; away: string };
  def: { home: string; away: string };
  poisson_distribution: { home: string; away: string };
  h2h: { home: string; away: string };
  goals: { home: string; away: string };
  total: { home: string; away: string };
}

export interface PredictionResponse {
  predictions: Prediction;
  league: League;
  teams: {
    home: Team & {
      last_5?: {
        form: string;
        att: string;
        def: string;
        goals: { for: { total: number; average: number }; against: { total: number; average: number } };
      };
    };
    away: Team & {
      last_5?: {
        form: string;
        att: string;
        def: string;
        goals: { for: { total: number; average: number }; against: { total: number; average: number } };
      };
    };
  };
  comparison: PredictionComparison;
  h2h: FixtureItem[];
}
