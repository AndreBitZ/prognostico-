"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MAIN_LEAGUES } from "@/lib/api";

export default function LeagueFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("league") || "";

  function selectLeague(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("league", id);
    } else {
      params.delete("league");
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => selectLeague("")}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          !current
            ? "bg-blue-600 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        Todas
      </button>
      {MAIN_LEAGUES.map((league) => (
        <button
          key={league.id}
          onClick={() => selectLeague(league.id)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            current === league.id
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
