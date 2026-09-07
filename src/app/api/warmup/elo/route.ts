import { NextResponse } from "next/server";
import { getClubEloTable } from "@/lib/clubelo";

export const dynamic = "force-dynamic";

/** Preenche a cache de 24h. Chamado pelo cron ou à mão. */
export async function GET() {
  const rows = await getClubEloTable();
  return NextResponse.json({
    ok: rows.length > 0,
    clubs: rows.length,
    sample: rows.slice(0, 3).map((r) => ({ club: r.club, elo: r.elo })),
  });
}
