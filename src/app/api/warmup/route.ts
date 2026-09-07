import { NextResponse } from "next/server";
import { warmupComplements } from "@/lib/warmup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const result = await warmupComplements();
  return NextResponse.json({ ok: result.elo > 0, ...result });
}
