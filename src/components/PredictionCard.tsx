import { PredictionResponse } from "@/types/api";

interface PredictionCardProps {
  data: PredictionResponse;
}

export default function PredictionCard({ data }: PredictionCardProps) {
  const { predictions, teams, comparison } = data;

  const homePercent = parseInt(predictions.percent.home) || 0;
  const drawPercent = parseInt(predictions.percent.draw) || 0;
  const awayPercent = parseInt(predictions.percent.away) || 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
        <h2 className="text-lg font-bold">Prognóstico da API</h2>
        <p className="text-blue-100 text-sm mt-1">{predictions.advice}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Probabilities */}
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Probabilidades
          </h3>
          <div className="space-y-3">
            {/* Home */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{teams.home.name}</span>
                <span className="font-bold text-blue-600">{predictions.percent.home}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${homePercent}%` }}
                />
              </div>
            </div>

            {/* Draw */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Empate</span>
                <span className="font-bold text-slate-600">{predictions.percent.draw}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full transition-all"
                  style={{ width: `${drawPercent}%` }}
                />
              </div>
            </div>

            {/* Away */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{teams.away.name}</span>
                <span className="font-bold text-emerald-600">{predictions.percent.away}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${awayPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Winner + Advice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-xs text-blue-600 font-semibold uppercase mb-1">
              Vencedor previsto
            </div>
            <div className="font-bold text-slate-900">
              {predictions.winner?.name || "Empate possível"}
            </div>
            {predictions.winner?.comment && (
              <div className="text-sm text-slate-600 mt-1">
                {predictions.winner.comment}
              </div>
            )}
          </div>

          <div className="bg-amber-50 rounded-xl p-4">
            <div className="text-xs text-amber-600 font-semibold uppercase mb-1">
              Over / Under
            </div>
            <div className="font-bold text-slate-900">
              {predictions.under_over || "N/A"}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              Golos: {predictions.goals?.home || "?"} - {predictions.goals?.away || "?"}
            </div>
          </div>
        </div>

        {/* Comparison */}
        {comparison && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Comparação de Equipas
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="font-medium text-slate-700">{teams.home.name}</div>
              <div className="text-slate-400">vs</div>
              <div className="font-medium text-slate-700">{teams.away.name}</div>

              {[
                { label: "Forma", key: "form" as const },
                { label: "Ataque", key: "att" as const },
                { label: "Defesa", key: "def" as const },
                { label: "Golos", key: "goals" as const },
              ].map((item) => (
                <div key={item.key} className="contents">
                  <div className="bg-slate-50 rounded py-2 font-semibold">
                    {comparison[item.key]?.home || "-"}
                  </div>
                  <div className="text-xs text-slate-400 self-center">{item.label}</div>
                  <div className="bg-slate-50 rounded py-2 font-semibold">
                    {comparison[item.key]?.away || "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
