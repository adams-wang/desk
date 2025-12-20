import { NextResponse } from "next/server";
import { getL1Contract } from "@/lib/queries/market";
import { getLatestTradingDate } from "@/lib/queries/trading-days";

export async function GET() {
  try {
    const tradingDate = getLatestTradingDate();
    const l1 = getL1Contract(tradingDate);

    return NextResponse.json({
      tradingDate,
      regime: l1?.regime || "UNKNOWN",
      regimeTransition: l1?.regimeTransition || null,
      vix: l1?.vixValue || 0,
      vixBucket: l1?.vixBucket || "unknown",
      positionPct: l1?.positionPct || 100,
      confidence: l1?.confidence || "LOW",
    });
  } catch (error) {
    console.error("Context API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch context" },
      { status: 500 }
    );
  }
}
