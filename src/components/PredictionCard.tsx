import { PredictionResult } from "@/types/api";

interface PredictionCardProps {
  data: PredictionResult;
}

export default function PredictionCard({ data }: PredictionCardProps) {
  const { predictions, note, standingsContext, market } = data;

  const bars = [
    { label: "Casa", value: predictions.home, color: "bg-blue-500" },
    { label: "Empate", value: predictions.draw, color: "bg-slate-400" },
    { label: "Fora", value: predictions.away, color: "bg-emerald-500" },
  ];

  const confidenceColor =
    predictions.confidence === "Alta"
      ? "bg-emerald-100 text-emerald-800"
      : predictions.confidence === "Média"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Prognóstico</h2>
          <p className="text-sm text-slate-500">{note}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${confidenceColor}`}
        >
          Confiança {predictions.confidence}
        </span>
      </div>

      <div className="space-y-4">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-slate-700">{bar.label}</span>
              <span className="font-bold text-slate-900">{bar.value}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${bar.color} rounded-full transition-all`}
                style={{ width: `${bar.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {market && (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-sm font-semibold text-slate-800">Mercado (The Odds API)</p>
            <div className="flex flex-wrap gap-1 justify-end">
              {market.value && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                  Valor +{market.edge}%
                </span>
              )}
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  market.agrees
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {market.agrees ? "Concorda com o modelo" : "Discorda do modelo"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-slate-500">Casa</p>
              <p className="font-bold">{market.homeOdd}</p>
              <p className="text-xs text-slate-500">{market.home}%</p>
            </div>
            <div>
              <p className="text-slate-500">Empate</p>
              <p className="font-bold">{market.drawOdd}</p>
              <p className="text-xs text-slate-500">{market.draw}%</p>
            </div>
            <div>
              <p className="text-slate-500">Fora</p>
              <p className="font-bold">{market.awayOdd}</p>
              <p className="text-xs text-slate-500">{market.away}%</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Média sem margem de {market.books} casas (região EU).
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            code: "1X",
            label: "Vitória ou empate",
            value: predictions.homeOrDraw ?? predictions.home + predictions.draw,
            hint: data.match.homeTeam.name,
          },
          {
            code: "12",
            label: "Vitória de uma das equipas",
            value: predictions.homeOrAway ?? predictions.home + predictions.away,
            hint: "Sem empate",
          },
          {
            code: "X2",
            label: "Derrota ou empate",
            value: predictions.awayOrDraw ?? predictions.away + predictions.draw,
            hint: data.match.awayTeam.name,
          },
        ].map((row) => (
          <div
            key={row.code}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"
          >
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{row.code}</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{row.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{Math.min(99, row.value)}%</p>
            <p className="text-[11px] text-slate-500 truncate">{row.hint}</p>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
        <p className="text-sm text-blue-600 mb-1">Sugestão 1X2</p>
        <p className="text-lg font-bold text-blue-900">{predictions.advice}</p>
        {predictions.votes && (
          <p className="text-[11px] text-blue-700 mt-2">
            Votos: Poisson {predictions.votes.poisson} · pi-rating {predictions.votes.pi} · Bradley-Terry {predictions.votes.bradleyTerry}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">xG Casa</p>
          <p className="text-lg font-bold text-slate-900">
            {predictions.expectedGoals.home}
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">xG Fora</p>
          <p className="text-lg font-bold text-slate-900">
            {predictions.expectedGoals.away}
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">Over 2.5</p>
          <p className="text-lg font-bold text-slate-900">
            {predictions.over25}%
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">BTTS Sim</p>
          <p className="text-lg font-bold text-slate-900">{predictions.btts}%</p>
        </div>
      </div>

      {predictions.topScores?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Resultados mais prováveis
          </h3>
          <div className="flex flex-wrap gap-2">
            {predictions.topScores.map((s) => (
              <span
                key={s.score}
                className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 text-sm font-medium px-3 py-1.5 rounded-lg"
              >
                {s.score}
                <span className="text-slate-500 text-xs">{s.percent}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {(standingsContext?.home || standingsContext?.away) && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Contexto na tabela
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="font-medium text-slate-900 mb-1">
                {data.match.homeTeam.name}
              </p>
              {standingsContext?.home ? (
                <p className="text-slate-600 text-xs leading-relaxed">
                  {standingsContext.home.position}º ·{" "}
                  {standingsContext.home.points} pts ·{" "}
                  {standingsContext.home.gf}:{standingsContext.home.ga} em{" "}
                  {standingsContext.home.played} jogos
                </p>
              ) : (
                <p className="text-slate-400 text-xs">Sem dados</p>
              )}
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="font-medium text-slate-900 mb-1">
                {data.match.awayTeam.name}
              </p>
              {standingsContext?.away ? (
                <p className="text-slate-600 text-xs leading-relaxed">
                  {standingsContext.away.position}º ·{" "}
                  {standingsContext.away.points} pts ·{" "}
                  {standingsContext.away.gf}:{standingsContext.away.ga} em{" "}
                  {standingsContext.away.played} jogos
                </p>
              ) : (
                <p className="text-slate-400 text-xs">Sem dados</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
