export type Outcome = "home" | "draw" | "away";

type Bucket = {
  min: number;
  max: number;
  predicted: number;
  observed: number;
  n: number;
};

const buckets: Bucket[] = [
  { min: 0, max: 35, predicted: 0.28, observed: 0.3, n: 40 },
  { min: 35, max: 45, predicted: 0.4, observed: 0.38, n: 80 },
  { min: 45, max: 55, predicted: 0.5, observed: 0.47, n: 120 },
  { min: 55, max: 65, predicted: 0.6, observed: 0.56, n: 90 },
  { min: 65, max: 100, predicted: 0.72, observed: 0.66, n: 50 },
];

const ledger: { matchId: number; winner: Outcome; probs: { home: number; draw: number; away: number }; ts: number }[] = [];

function bucketFor(pct: number) {
  return buckets.find((b) => pct >= b.min && pct < b.max) || buckets[buckets.length - 1];
}

export function calibrateProbability(pct: number) {
  const b = bucketFor(pct);
  const shrink = Math.min(0.4, 20 / (20 + b.n));
  const mixed = (pct / 100) * (1 - shrink) + b.observed * shrink;
  return Math.max(0.08, Math.min(0.86, mixed));
}

export function calibrateTrio(home: number, draw: number, away: number) {
  const h = calibrateProbability(home * 100);
  const d = calibrateProbability(draw * 100);
  const a = calibrateProbability(away * 100);
  const s = h + d + a;
  return { home: h / s, draw: d / s, away: a / s };
}

export function recordPrediction(
  matchId: number,
  winner: Outcome,
  probs: { home: number; draw: number; away: number }
) {
  if (ledger.some((x) => x.matchId === matchId)) return;
  ledger.push({ matchId, winner, probs, ts: Date.now() });
}

export function settlePrediction(matchId: number, actual: Outcome) {
  const row = ledger.find((x) => x.matchId === matchId);
  if (!row) return;
  const predPct = row.probs[row.winner] * 100;
  const b = bucketFor(predPct);
  b.n += 1;
  b.observed = (b.observed * (b.n - 1) + (actual === row.winner ? 1 : 0)) / b.n;
}

export function calibrationSummary() {
  return buckets.map((b) => ({ ...b }));
}
