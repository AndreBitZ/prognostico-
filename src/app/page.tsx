import { Suspense } from "react";
import { getFixtures } from "@/lib/api-football";
import MatchCard from "@/components/MatchCard";
import LeagueFilter from "@/components/LeagueFilter";
import { FixtureItem } from "@/types/api";

interface HomeProps {
  searchParams: Promise<{ league?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const leagueId = params.league ? parseInt(params.league) : undefined;

  let matches: FixtureItem[] = [];
  let error: string | null = null;

  try {
    const data = await getFixtures({
      league: leagueId,
      next: 20,
    });

    if (data?.response) {
      matches = data.response;
    } else if (data?.errors?.length) {
      error = "Erro ao carregar jogos. Verifica a API key.";
    }
  } catch {
    error = "Não foi possível conectar à API. Verifica a API_FOOTBALL_KEY.";
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Próximos Jogos
        </h1>
        <p className="text-slate-600">
          Seleciona um jogo para ver o prognóstico detalhado e estatísticas.
        </p>
      </div>

      <Suspense fallback={<div className="h-10 bg-slate-100 rounded animate-pulse mb-6" />}>
        <LeagueFilter />
      </Suspense>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
          <p className="font-medium">⚠️ {error}</p>
          <p className="text-sm mt-1">
            Cria um ficheiro <code className="bg-red-100 px-1 rounded">.env.local</code> com:
            <br />
            <code className="bg-red-100 px-1 rounded">API_FOOTBALL_KEY=a_tua_chave</code>
          </p>
        </div>
      )}

      {!error && matches.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg">Nenhum jogo encontrado.</p>
          <p className="text-sm mt-2">Tenta outra liga ou verifica a API key.</p>
        </div>
      )}

      <div className="grid gap-4">
        {matches.map((match) => (
          <MatchCard key={match.fixture.id} match={match} />
        ))}
      </div>
    </div>
  );
}
