import { NextResponse } from "next/server";
import { buildCompstatResponse } from "@/lib/compstat";
import { DEFAULT_FOCUS_WINDOW } from "@/lib/compstatWindows";
import type { CompstatWindowId } from "@/lib/types";

const WINDOW_IDS: CompstatWindowId[] = ["7d", "28d", "ytd", "365d"];
const isWindowId = (value: string): value is CompstatWindowId =>
  WINDOW_IDS.includes(value as CompstatWindowId);

const cleanFilter = (value: string | null) =>
  value && value !== "ALL" ? value.trim() : undefined;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const focusParam = searchParams.get("focusRange") ?? "";
  const focusRange = isWindowId(focusParam)
    ? focusParam
    : DEFAULT_FOCUS_WINDOW;

  const division = cleanFilter(searchParams.get("division"));
  const offenseCategory = cleanFilter(
    searchParams.get("offenseCategory"),
  );

  try {
    const payload = await buildCompstatResponse(
      { division, offenseCategory },
      focusRange,
    );
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to build CompStat response", error);
    return NextResponse.json(
      { error: "Unable to load CompStat data at this time." },
      { status: 500 },
    );
  }
}

