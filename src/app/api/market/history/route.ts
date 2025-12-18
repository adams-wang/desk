import { NextResponse } from "next/server";
import { getIndexHistory } from "@/lib/queries/market";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const index = searchParams.get("index") || "^GSPC";
    const days = parseInt(searchParams.get("days") || "20", 10);
    const date = searchParams.get("date") || undefined;

    const history = getIndexHistory(index, days, date);

    return NextResponse.json({
      index,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching index history:", error);
    return NextResponse.json(
      { error: "Failed to fetch index history" },
      { status: 500 }
    );
  }
}
