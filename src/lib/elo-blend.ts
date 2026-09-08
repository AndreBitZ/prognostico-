/** Peso do ClubElo no λ: mais forte no início da época (tabela ainda curta). */
export function clubEloFactor(
  homeElo?: number | null,
  awayElo?: number | null,
  homePlayed = 0,
  awayPlayed = 0
): { factor: number; used: boolean; denom: number } {
  if (!homeElo || !awayElo || homeElo < 1000 || awayElo < 1000) {
    return { factor: 1, used: false, denom: 2000 };
  }
  const sample = Math.min(homePlayed, awayPlayed);
  const denom = sample < 6 ? 1400 : sample < 10 ? 1700 : 2000;
  const raw = Math.pow(10, (homeElo - awayElo) / denom);
  const factor = Math.max(0.88, Math.min(1.14, raw));
  return { factor, used: true, denom };
}
