import Link from "next/link";
import { runBacktest } from "@/lib/backtest";

export const dynamic = "force-dynamic";

const LEAGUES = [
  { id: "PPL", name: "Primeira Liga" },
  { id: "PL", name: "Premier League" },
  { id: "PD", name: "La Liga" },
  { id: "SA", name: "Serie A" },
  { id: "BL1", name: "Bundesliga" },
  { id: "FL1", name: "Ligue 1" },
  { id: "ELC", name: "Championship" },
  { id: "DED", name: "Eredivisie" },
];

export default async function DesempenhoPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const { league } = await searchParams;
  const code = (league || "PPL").toUpperCase();
  const result = await runBacktest(code);
  const leagueName = LEAGUES.find((l) => l.id === code)?.name || code;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
          ← Jogos
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">Desempenho</h1>
        <p className="text-slate-600 mt-1 max-w-2xl">
          Walk-forward no football.json: cada jogo é previsto só com resultados
          anteriores. Poisson + Dixon-Coles com os ρ e a vantagem de casa da liga.
          Não usa a quota do football-data.org.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEAGUES.map((l) => (
          <Link
            key={l.id}
            href={`/desempenho?league=${l.id}`}
            className={`text-sm px-3 py-1.5 rounded-full border ${
              l.id === code
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
            }`}
          >
            {l.name}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Jogos testados" value={String(result.n)} />
        <Stat
          label="Acerto 1X2"
          value={`${Math.round(result.accuracy * 100)}%`}
        />
        <Stat label="Brier (menor é melhor)" value={result.brier.toFixed(3)} />
        <Stat label="Liga" value={leagueName} />
      </div>

      <p className="text-xs text-slate-500">
        Real: casa {Math.round(result.byOutcome.home * 100)}% · empate{" "}
        {Math.round(result.byOutcome.draw * 100)}% · fora{" "}
        {Math.round(result.byOutcome.away * 100)}%. Modelo escolheu casa{" "}
        {Math.round(result.predictedShare.home * 100)}% · empate{" "}
        {Math.round(result.predictedShare.draw * 100)}% · fora{" "}
        {Math.round(result.predictedShare.away * 100)}%. Um Brier de ~0.58 é um
        palpite 1X2 sem informação; ~0.50 já é útil; o mercado anda perto de 0.48.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Jogo</th>
              <th className="px-3 py-2 font-medium">Res.</th>
              <th className="px-3 py-2 font-medium">Modelo</th>
              <th className="px-3 py-2 font-medium">1X2 %</th>
              <th className="px-3 py-2 font-medium">Brier</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r) => (
              <tr key={`${r.date}-${r.home}-${r.away}`} className="border-t">
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.date}</td>
                <td className="px-3 py-2">
                  {r.home} – {r.away}
                </td>
                <td className="px-3 py-2 font-medium">{r.score}</td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      r.hit
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {r.predicted === "home"
                      ? "Casa"
                      : r.predicted === "away"
                        ? "Fora"
                        : "Empate"}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {r.pHome}/{r.pDraw}/{r.pAway}
                </td>
                <td className="px-3 py-2 text-slate-600">{r.brier.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
