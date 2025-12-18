import { NextResponse } from "next/server";
import { getMarketOverview } from "@/lib/queries/market";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;

    const overview = getMarketOverview(date);

    if (!overview) {
      return NextResponse.json(
        { error: "Market data not available for the specified date" },
        { status: 404 }
      );
    }

    return NextResponse.json(overview);
  } catch (error) {
    console.error("Error fetching market overview:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
