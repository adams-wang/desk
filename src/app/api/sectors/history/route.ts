import { NextResponse } from "next/server";
import { getSectorMRSHistory } from "@/lib/queries/sectors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "5", 10);
    const date = searchParams.get("date") || undefined;

    const history = getSectorMRSHistory(days, date);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching sector history:", error);
    return NextResponse.json(
      { error: "Failed to fetch sector history" },
      { status: 500 }
    );
  }
}
