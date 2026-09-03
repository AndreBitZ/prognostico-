import Image from "next/image";
import Link from "next/link";
import { getPrediction, getFixtureById } from "@/lib/api-football";
import PredictionCard from "@/components/PredictionCard";
import { FixtureItem, PredictionResponse } from "@/types/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JogoPage({ params }: PageProps) {
  const { id } = await params;
  const fixtureId = parseInt(id);

  let fixture: FixtureItem | null = null;
  let prediction: PredictionResponse | null = null;
  let error: string | null = null;

  try {
    const [fixtureData, predictionData] = await Promise.all([
      getFixtureById(fixtureId),
      getPrediction(fixtureId),
    ]);

    if (fixtureData?.response?.[0]) {
      fixture = fixtureData.response[0];
    }

    if (predictionData?.response?.[0]) {
      prediction = predictionData.response[0];
    }
  } catch {
    error = "Erro ao carregar dados do jogo.";
  }

  if (error || !fixture) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 font-medium mb-4">
          {error || "Jogo não encontrado."}
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Voltar aos jogos
        </Link>
      </div>
    );
  }

  const { teams, league, fixture: fix, goals } = fixture;
  const date = new Date(fix.date);
  const formattedDate = date.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isFinished = fix.status.short === "FT";

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-6"
      >
        ← Voltar aos jogos
      </Link>

      {/* Match Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
          {league.logo && (
            <Image src={league.logo} alt={league.name} width={20} height={20} />
          )}
          <span>
            {league.name} · {league.round}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 max-w-2xl mx-auto">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center text-center">
            <Image
              src={teams.home.logo}
              alt={teams.home.name}
              width={64}
              height={64}
              className="object-contain mb-2"
            />
            <span className="font-bold text-lg text-slate-900">
              {teams.home.name}
            </span>
          </div>

          {/* Score */}
          <div className="text-center px-4">
            {isFinished ? (
              <div className="text-4xl font-bold text-slate-900">
                {goals.home} - {goals.away}
              </div>
            ) : (
              <div className="text-2xl font-bold text-slate-400">VS</div>
            )}
            <div className="text-xs text-slate-500 mt-2">{formattedDate}</div>
            <div className="text-xs font-medium text-slate-400 mt-1">
              {fix.status.long}
            </div>
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center text-center">
            <Image
              src={teams.away.logo}
              alt={teams.away.name}
              width={64}
              height={64}
              className="object-contain mb-2"
            />
            <span className="font-bold text-lg text-slate-900">
              {teams.away.name}
            </span>
          </div>
        </div>
      </div>

      {/* Prediction */}
      {prediction ? (
        <PredictionCard data={prediction} />
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium">
            Prognóstico ainda não disponível para este jogo.
          </p>
          <p className="text-sm text-amber-600 mt-1">
            A API só gera predictions para alguns jogos próximos.
          </p>
        </div>
      )}
    </div>
  );
}
