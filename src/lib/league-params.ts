export type LeagueParams = {
  rho: number;
  homeAdvantageFallback: number;
  piWeight: number;
  btWeight: number;
  marketWeight: number;
  nbOverWeight: number;
};

/**
 * Calibrado com resultados 2024/25 + 2025/26 (openfootball/football.json):
 * PL 733, ELC 1078, PD 735, SA 714, BL1 600, FL1 588, PPL 593, DED 601.
 * homeAdvantageFallback ≈ GF casa / GF fora observado.
 * rho mais negativo onde há mais empates; nbOverWeight sobe com Over 2.5 real.
 */
const DEFAULTS: LeagueParams = {
  rho: -0.08,
  homeAdvantageFallback: 1.22,
  piWeight: 0.26,
  btWeight: 0.12,
  marketWeight: 0.22,
  nbOverWeight: 0.55,
};

const BY_CODE: Record<string, Partial<LeagueParams>> = {
  PL: {
    rho: -0.08,
    homeAdvantageFallback: 1.15,
    marketWeight: 0.26,
    nbOverWeight: 0.58,
  },
  ELC: {
    rho: -0.1,
    homeAdvantageFallback: 1.27,
    marketWeight: 0.2,
    nbOverWeight: 0.5,
  },
  PD: {
    rho: -0.08,
    homeAdvantageFallback: 1.33,
    marketWeight: 0.24,
    nbOverWeight: 0.52,
  },
  SA: {
    rho: -0.09,
    homeAdvantageFallback: 1.11,
    nbOverWeight: 0.5,
  },
  BL1: {
    rho: -0.08,
    homeAdvantageFallback: 1.15,
    nbOverWeight: 0.62,
  },
  FL1: {
    rho: -0.04,
    homeAdvantageFallback: 1.22,
    nbOverWeight: 0.57,
  },
  CL: {
    rho: -0.06,
    homeAdvantageFallback: 1.16,
    marketWeight: 0.28,
    piWeight: 0.2,
  },
  PPL: {
    rho: -0.09,
    homeAdvantageFallback: 1.23,
    marketWeight: 0.2,
    nbOverWeight: 0.54,
  },
  DED: {
    rho: -0.09,
    homeAdvantageFallback: 1.31,
    nbOverWeight: 0.6,
  },
  BSA: {
    rho: -0.07,
    homeAdvantageFallback: 1.27,
    nbOverWeight: 0.58,
  },
};

export function getLeagueParams(code?: string | null): LeagueParams {
  const key = String(code || "").toUpperCase();
  return { ...DEFAULTS, ...(BY_CODE[key] || {}) };
}
