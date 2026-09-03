import { Suspense } from "react";
import { getFixtures } from "@/lib/api";
import MatchCard from "@/components/MatchCard";
import LeagueFilter from "@/components/LeagueFilter";
import { Match } from "@/types/api";

interface HomeProps {
  searchParams: Promise<{ league?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const leagueCode = params.league || undefined;

  let matches: Match[] = [];
  let error: string | null = null;

  try {
    matches = await getFixtures({ league: leagueCode });
  } catch {
    error = "Não foi possível carregar os jogos. Tenta novamente mais tarde.";
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Próximos Jogos
        </h1>
        <p className="text-slate-600">
          Seleciona um jogo para ver o prognóstico detalhado.
        </p>
      </div>

      <Suspense fallback={<div className="h-10 bg-slate-100 rounded animate-pulse mb-6" />}>
        <LeagueFilter />
      </Suspense>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
          <p className="font-medium">⚠️ {error}</p>
        </div>
      )}

      {!error && matches.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg">Nenhum jogo encontrado neste período.</p>
          <p className="text-sm mt-2">Tenta outra liga ou volta mais tarde.</p>
        </div>
      )}

      <div className="grid gap-4">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}
