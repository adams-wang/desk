import { NextRequest, NextResponse } from "next/server";
import { getLatestTradingDate } from "@/lib/queries/trading-days";
import fs from "fs";
import path from "path";

const REPORTS_BASE_PATH = "/Volumes/Data/quant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const searchParams = request.nextUrl.searchParams;
  const variant = searchParams.get("variant") || "10"; // "10" or "20"
  const date = searchParams.get("date") || getLatestTradingDate();

  // Validate variant
  if (variant !== "10" && variant !== "20") {
    return NextResponse.json(
      { error: "Invalid variant. Must be '10' or '20'" },
      { status: 400 }
    );
  }

  // Construct file path
  const reportsDir = `reports_${variant}`;
  const fileName = `${ticker.toUpperCase()}.en.md`;
  const filePath = path.join(REPORTS_BASE_PATH, reportsDir, date, fileName);

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Report not found", ticker, variant, date },
        { status: 404 }
      );
    }

    // Read the markdown file
    const content = fs.readFileSync(filePath, "utf-8");

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      variant,
      date,
      content,
    });
  } catch (error) {
    console.error("Error reading report:", error);
    return NextResponse.json(
      { error: "Failed to read report" },
      { status: 500 }
    );
  }
}
