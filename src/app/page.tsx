import { Suspense } from "react";
import { getFixtures } from "@/lib/api";
import MatchCard from "@/components/MatchCard";
import LeagueFilter from "@/components/LeagueFilter";
import DateFilter from "@/components/DateFilter";
import { Match } from "@/types/api";

interface HomeProps {
  searchParams: Promise<{ league?: string; date?: string }>;
}

function matchDateISO(utcDate: string) {
  const d = new Date(utcDate);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const leagueCode = params.league || undefined;
  const dateFilter = params.date || "";

  let matches: Match[] = [];
  let error: string | null = null;

  try {
    matches = await getFixtures({ league: leagueCode });
    if (dateFilter) {
      matches = matches.filter((m) => matchDateISO(m.utcDate) === dateFilter);
    }
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
          Filtra por competição e data. Desliza para o lado para mudar de dia.
        </p>
      </div>

      <Suspense fallback={<div className="h-10 bg-slate-100 rounded animate-pulse mb-4" />}>
        <LeagueFilter />
      </Suspense>
      <Suspense fallback={<div className="h-16 bg-slate-100 rounded animate-pulse mb-6" />}>
        <DateFilter />
      </Suspense>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
          <p className="font-medium">⚠️ {error}</p>
        </div>
      )}

      {!error && matches.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg">Nenhum jogo encontrado neste período.</p>
          <p className="text-sm mt-2">Tenta outra liga, outra data ou volta mais tarde.</p>
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
