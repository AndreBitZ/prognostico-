import Image from "next/image";
import Link from "next/link";
import { getPrediction, getFixtureById } from "@/lib/api";
import PredictionCard from "@/components/PredictionCard";
import { Match, PredictionResult } from "@/types/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JogoPage({ params }: PageProps) {
  const { id } = await params;

  let match: Match | null = null;
  let prediction: PredictionResult | null = null;
  let error: string | null = null;

  try {
    prediction = (await getPrediction(id)) as PredictionResult | null;
    match = (prediction?.match as Match | undefined) || (await getFixtureById(id));
    if (!match) {
      error =
        "Jogo não encontrado ou a API de dados está temporariamente indisponível.";
    }
  } catch {
    try {
      match = await getFixtureById(id);
    } catch {
      match = null;
    }
    error = match
      ? null
      : "Erro ao carregar dados do jogo. A API pode ter atingido o limite de pedidos.";
  }

  if (error || !match) {
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

  const date = new Date(match.utcDate);
  const formattedDate = date.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isFinished = match.status === "FINISHED";
  const emblem = match.competition?.emblem;

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-6"
      >
        ← Voltar aos jogos
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
          {emblem && (
            <Image
              src={emblem}
              alt={match.competition?.name || "Competição"}
              width={20}
              height={20}
            />
          )}
          <span>
            {match.competition?.name || "Competição"}
            {match.matchday ? ` · Jornada ${match.matchday}` : ""}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 max-w-2xl mx-auto">
          <div className="flex-1 flex flex-col items-center text-center">
            {match.homeTeam?.crest ? (
              <Image
                src={match.homeTeam.crest}
                alt={match.homeTeam.name}
                width={64}
                height={64}
                className="object-contain mb-2"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 mb-2" />
            )}
            <span className="font-bold text-lg text-slate-900">
              {match.homeTeam?.name}
            </span>
          </div>

          <div className="text-center px-4">
            {isFinished && match.score?.fullTime ? (
              <div className="text-4xl font-bold text-slate-900">
                {match.score.fullTime.home} - {match.score.fullTime.away}
              </div>
            ) : (
              <div className="text-2xl font-bold text-slate-400">VS</div>
            )}
            <div className="text-xs text-slate-500 mt-2">{formattedDate}</div>
            <div className="text-xs font-medium text-slate-400 mt-1">
              {match.status}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center text-center">
            {match.awayTeam?.crest ? (
              <Image
                src={match.awayTeam.crest}
                alt={match.awayTeam.name}
                width={64}
                height={64}
                className="object-contain mb-2"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 mb-2" />
            )}
            <span className="font-bold text-lg text-slate-900">
              {match.awayTeam?.name}
            </span>
          </div>
        </div>
      </div>

      {prediction ? (
        <PredictionCard data={prediction} />
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium">
            Prognóstico não disponível para este jogo.
          </p>
        </div>
      )}
    </div>
  );
}
