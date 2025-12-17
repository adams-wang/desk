import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const REPORTS_BASE_PATH = "/Volumes/Data/quant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const searchParams = request.nextUrl.searchParams;
  const variant = searchParams.get("variant") || "10";

  // Validate variant
  if (variant !== "10" && variant !== "20") {
    return NextResponse.json(
      { error: "Invalid variant. Must be '10' or '20'" },
      { status: 400 }
    );
  }

  const reportsDir = path.join(REPORTS_BASE_PATH, `reports_${variant}`);
  const fileName = `${ticker.toUpperCase()}.en.md`;

  try {
    // Get all date directories
    if (!fs.existsSync(reportsDir)) {
      return NextResponse.json({ dates: [] });
    }

    const dateDirs = fs.readdirSync(reportsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name)) // Only YYYY-MM-DD format
      .filter(date => {
        // Check if report exists for this ticker on this date
        const filePath = path.join(reportsDir, date, fileName);
        return fs.existsSync(filePath);
      })
      .sort((a, b) => a.localeCompare(b)); // Sort ascending

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      variant,
      dates: dateDirs,
    });
  } catch (error) {
    console.error("Error reading report dates:", error);
    return NextResponse.json(
      { error: "Failed to read report dates" },
      { status: 500 }
    );
  }
}
