import { NextResponse } from "next/server";
import { getL1ContractFull } from "@/lib/queries/market";
import { getLatestTradingDate } from "@/lib/queries/trading-days";

export async function GET() {
  try {
    const tradingDate = getLatestTradingDate();
    // Use L1 JSON file as source of truth (not database table)
    const l1 = getL1ContractFull(tradingDate);

    return NextResponse.json({
      tradingDate,
      regime: l1?.regime || "UNKNOWN",
      regimeTransition: l1?.regimeTransition || null,
      vix: l1?.signals?.vixValue || 0,
      vixBucket: l1?.signals?.vixBucket || "unknown",
      positionPct: l1?.guidance?.positionSizeMaxPct || 100,
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
