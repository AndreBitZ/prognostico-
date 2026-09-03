type GoalSample = { scored: number; conceded: number };
type FormSample = { matches: GoalSample[] };

export function negativeBinomialPmf(k: number, lambda: number, r = 9): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  const size = Math.max(2, r);
  const p = size / (size + lambda);
  let coeff = 1;
  for (let i = 0; i < k; i++) coeff *= (i + size) / (i + 1);
  return coeff * Math.pow(p, size) * Math.pow(1 - p, k);
}

export function estimateNbSize(
  homeForm: FormSample,
  awayForm: FormSample,
  leagueAvg: number
) {
  const samples: number[] = [];
  homeForm.matches.forEach((m) => {
    samples.push(m.scored);
    samples.push(m.conceded);
  });
  awayForm.matches.forEach((m) => {
    samples.push(m.scored);
    samples.push(m.conceded);
  });

  const priorMean = Math.max(0.8, leagueAvg);
  const priorVar = priorMean * 1.16;
  const priorN = 12;

  const n = samples.length;
  const mean = n > 0 ? samples.reduce((s, x) => s + x, 0) / n : priorMean;
  const rawVar =
    n > 1
      ? samples.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (n - 1)
      : priorVar;

  const w = n / (n + priorN);
  const mu = mean * w + priorMean * (1 - w);
  const variance = rawVar * w + priorVar * (1 - w);
  const extra = Math.max(0.02, variance - mu);
  return Math.max(4, Math.min(22, (mu * mu) / extra));
}
