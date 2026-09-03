import Link from "next/link";
import Image from "next/image";
import { FixtureItem } from "@/types/api";

interface MatchCardProps {
  match: FixtureItem;
}

export default function MatchCard({ match }: MatchCardProps) {
  const { fixture, teams, league, goals } = match;
  const isFinished = fixture.status.short === "FT";
  const isLive = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(fixture.status.short);

  const date = new Date(fixture.date);
  const formattedDate = date.toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const formattedTime = date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link
      href={`/jogo/${fixture.id}`}
      className="block bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all p-4"
    >
      {/* League + Date */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <div className="flex items-center gap-2">
          {league.logo && (
            <Image
              src={league.logo}
              alt={league.name}
              width={16}
              height={16}
              className="rounded-sm"
            />
          )}
          <span className="font-medium">{league.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse">
              AO VIVO
            </span>
          )}
          <span>
            {formattedDate} · {formattedTime}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-4">
        {/* Home */}
        <div className="flex-1 flex items-center gap-3">
          <Image
            src={teams.home.logo}
            alt={teams.home.name}
            width={32}
            height={32}
            className="object-contain"
          />
          <span className="font-semibold text-slate-800 text-sm sm:text-base truncate">
            {teams.home.name}
          </span>
        </div>

        {/* Score / VS */}
        <div className="text-center min-w-[60px]">
          {isFinished || isLive ? (
            <div className="text-lg font-bold text-slate-900">
              {goals.home ?? 0} - {goals.away ?? 0}
            </div>
          ) : (
            <div className="text-sm font-medium text-slate-400">VS</div>
          )}
          <div className="text-[10px] text-slate-400 mt-0.5">
            {fixture.status.short}
          </div>
        </div>

        {/* Away */}
        <div className="flex-1 flex items-center gap-3 justify-end">
          <span className="font-semibold text-slate-800 text-sm sm:text-base truncate text-right">
            {teams.away.name}
          </span>
          <Image
            src={teams.away.logo}
            alt={teams.away.name}
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
      </div>
    </Link>
  );
}
