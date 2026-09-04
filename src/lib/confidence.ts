export type ConfidenceLevel = "Alta" | "Média" | "Baixa";

export function scoreConfidence(opts: {
  sample: number;
  matchday?: number;
  modelsAgree?: boolean;
  threeAgree?: boolean;
  marketAgrees?: boolean;
  edge?: number;
  ppgGap?: number;
}): ConfidenceLevel {
  const sample = opts.sample;
  const matchday = opts.matchday ?? 99;
  const edge = opts.edge ?? 0;
  const gap = opts.ppgGap ?? 0;
  const modelsAgree = opts.modelsAgree ?? true;
  const threeAgree = opts.threeAgree ?? false;
  const marketAgrees = opts.marketAgrees ?? true;

  const strong = edge >= 52 || gap >= 0.65;
  const mild = edge >= 42 || gap >= 0.3;

  let level: ConfidenceLevel = "Baixa";
  if (sample >= 8 && strong && threeAgree && marketAgrees) level = "Alta";
  else if (sample >= 4 && mild && modelsAgree) level = "Média";

  if (matchday <= 6 && level === "Alta") level = "Média";
  return level;
}

export function confidenceClass(level: ConfidenceLevel) {
  if (level === "Alta") return "bg-emerald-100 text-emerald-800";
  if (level === "Média") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}
