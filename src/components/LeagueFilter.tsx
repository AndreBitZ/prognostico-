"use client";

import { MAIN_LEAGUES } from "@/lib/api-football";
import { useRouter, useSearchParams } from "next/navigation";

export default function LeagueFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentLeague = searchParams.get("league");

  function handleChange(leagueId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (leagueId) {
      params.set("league", leagueId);
    } else {
      params.delete("league");
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => handleChange("")}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          !currentLeague
            ? "bg-blue-600 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        Todos
      </button>
      {MAIN_LEAGUES.map((league) => (
        <button
          key={league.id}
          onClick={() => handleChange(String(league.id))}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            currentLeague === String(league.id)
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {league.name}
        </button>
      ))}
    </div>
  );
}
