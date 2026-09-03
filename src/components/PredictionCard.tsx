import { PredictionResult } from "@/types/api";

interface PredictionCardProps {
  data: PredictionResult;
}

export default function PredictionCard({ data }: PredictionCardProps) {
  const { predictions, note } = data;

  const bars = [
    { label: "Casa", value: predictions.home, color: "bg-blue-500" },
    { label: "Empate", value: predictions.draw, color: "bg-slate-400" },
    { label: "Fora", value: predictions.away, color: "bg-emerald-500" },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-1">Prognóstico</h2>
      <p className="text-sm text-slate-500 mb-6">{note}</p>

      <div className="space-y-4 mb-6">
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

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
        <p className="text-sm text-blue-600 mb-1">Sugestão</p>
        <p className="text-lg font-bold text-blue-900">{predictions.advice}</p>
      </div>
    </div>
  );
}
