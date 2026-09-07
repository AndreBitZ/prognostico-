export type LeagueParams = {
  rho: number;
  homeAdvantageFallback: number;
  piWeight: number;
  btWeight: number;
  marketWeight: number;
  nbOverWeight: number;
};

const DEFAULTS: LeagueParams = {
  rho: -0.08,
  homeAdvantageFallback: 1.25,
  piWeight: 0.28,
  btWeight: 0.15,
  marketWeight: 0.25,
  nbOverWeight: 0.55,
};

const BY_CODE: Record<string, Partial<LeagueParams>> = {
  PL: { rho: -0.1, homeAdvantageFallback: 1.28, marketWeight: 0.28 },
  PD: { rho: -0.09, homeAdvantageFallback: 1.3, marketWeight: 0.26 },
  SA: { rho: -0.11, homeAdvantageFallback: 1.26, nbOverWeight: 0.5 },
  BL1: { rho: -0.05, homeAdvantageFallback: 1.22, nbOverWeight: 0.6 },
  FL1: { rho: -0.08, homeAdvantageFallback: 1.27 },
  CL: { rho: -0.06, homeAdvantageFallback: 1.18, marketWeight: 0.3, piWeight: 0.22 },
  PPL: { rho: -0.09, homeAdvantageFallback: 1.32, marketWeight: 0.22 },
  DED: { rho: -0.06, homeAdvantageFallback: 1.24, nbOverWeight: 0.58 },
  BSA: { rho: -0.07, homeAdvantageFallback: 1.29, nbOverWeight: 0.58 },
};

export function getLeagueParams(code?: string | null): LeagueParams {
  const key = String(code || "").toUpperCase();
  return { ...DEFAULTS, ...(BY_CODE[key] || {}) };
}
