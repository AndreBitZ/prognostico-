"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MAIN_LEAGUES } from "@/lib/api";

export default function LeagueFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("league") || "";

  function selectLeague(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("league", id);
    else params.delete("league");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-slate-500 mb-2">Competição</p>
      <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
        <button
          onClick={() => selectLeague("")}
          className={`snap-start shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !current
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Todas
        </button>
        {MAIN_LEAGUES.map((league) => (
          <button
            key={league.id}
            onClick={() => selectLeague(league.id)}
            className={`snap-start shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              current === league.id
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {league.name}
          </button>
        ))}
      </div>
    </div>
  );
}
