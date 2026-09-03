import { calibrateTrio, recordPrediction } from "./calibration";

export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

export type RecentMatch = {
  opponentId: number;
  isHome: boolean;
  scored: number;
  conceded: number;
  utcDate: string;
};

export type RecentForm = {
  games: number;
  gf: number;
  ga: number;
  points: number;
  matches: RecentMatch[];
};

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function negativeBinomialPmf(k: number, lambda: number, r = 9): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  const p = r / (r + lambda);
  let coeff = 1;
  for (let i = 0; i < k; i++) coeff *= (i + r) / (i + 1);
  return coeff * Math.pow(p, r) * Math.pow(1 - p, k);
}

function pickWinner(h: number, d: number, a: number): "home" | "draw" | "away" {
  if (h >= d && h >= a) return "home";
  if (a >= d && a >= h) return "away";
  return "draw";
}

function bradleyTerryProbs(homePpg: number, awayPpg: number) {
  const h = Math.max(0.25, homePpg) + 0.28;
  const a = Math.max(0.25, awayPpg);
  const pHomeNoDraw = h / (h + a);
  const closeness = 1 - Math.abs(pHomeNoDraw - 0.5) * 2;
  const pDraw = Math.max(0.18, Math.min(0.32, 0.2 + 0.14 * closeness));
  const rest = 1 - pDraw;
  return {
    home: pHomeNoDraw * rest,
    draw: pDraw,
    away: (1 - pHomeNoDraw) * rest,
  };
}
