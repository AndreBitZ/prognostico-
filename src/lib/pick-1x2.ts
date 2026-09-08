export type Outcome1x2 = "home" | "draw" | "away";

/** Aceita 0–1 ou 0–100. Empate se P(empate) ≥ 26% e casa/fora perto. */
export function pick1x2(h: number, d: number, a: number): Outcome1x2 {
  const sum = h + d + a;
  const H = sum > 1.5 ? h / 100 : h;
  const D = sum > 1.5 ? d / 100 : d;
  const A = sum > 1.5 ? a / 100 : a;
  if (D >= 0.26 && Math.abs(H - A) <= 0.14 && D + 0.08 >= Math.max(H, A)) {
    return "draw";
  }
  if (H >= D && H >= A) return "home";
  if (A >= D && A >= H) return "away";
  return "draw";
}
