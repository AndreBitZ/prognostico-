import Link from "next/link";
import Image from "next/image";
import { Match } from "@/types/api";

interface MatchCardProps {
  match: Match;
}

export default function MatchCard({ match }: MatchCardProps) {
  const date = new Date(match.utcDate);
  const formattedDate = date.toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusLabel: Record<string, string> = {
    SCHEDULED: "Agendado",
    TIMED: "Agendado",
    IN_PLAY: "A decorrer",
    PAUSED: "Intervalo",
    LIVE: "Ao vivo",
    FINISHED: "Terminado",
  };

  return (
    <Link
      href={`/jogo/${match.id}`}
      className="block bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-4"
    >
      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <div className="flex items-center gap-2">
          {match.competition.emblem && (
            <Image
              src={match.competition.emblem}
              alt={match.competition.name}
              width={16}
              height={16}
              className="object-contain"
            />
          )}
          <span>{match.competition.name}</span>
        </div>
        <span>{formattedDate}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {match.homeTeam.crest ? (
            <Image
              src={match.homeTeam.crest}
              alt={match.homeTeam.name}
              width={28}
              height={28}
              className="object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-200 flex-shrink-0" />
          )}
          <span className="font-medium text-slate-900 truncate">
            {match.homeTeam.name}
          </span>
        </div>

        <div className="text-sm font-semibold text-slate-400 px-2">VS</div>

        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="font-medium text-slate-900 truncate text-right">
            {match.awayTeam.name}
          </span>
          {match.awayTeam.crest ? (
            <Image
              src={match.awayTeam.crest}
              alt={match.awayTeam.name}
              width={28}
              height={28}
              className="object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-200 flex-shrink-0" />
          )}
        </div>
      </div>

      <div className="mt-3 text-xs text-center text-slate-400">
        {statusLabel[match.status] || match.status}
      </div>
    </Link>
  );
}
