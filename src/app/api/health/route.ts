import { NextResponse } from "next/server";
import { getCompstatHealth } from "@/lib/compstat";
import { getSocrataHealth } from "@/lib/socrata";

export async function GET() {
  const compstat = getCompstatHealth();
  const socrata = getSocrataHealth();
  const isHealthy = Boolean(
    compstat.lastSuccess && socrata.lastSuccess && !socrata.lastError,
  );

  return NextResponse.json(
    {
      ok: isHealthy,
      compstat,
      socrata,
      timestamp: new Date().toISOString(),
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "public, max-age=30",
      },
    },
  );
}

