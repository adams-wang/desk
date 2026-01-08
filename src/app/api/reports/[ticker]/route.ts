import { NextRequest, NextResponse } from "next/server";
import { getLatestTradingDate } from "@/lib/queries/trading-days";
import db from "@/lib/db";
import fs from "fs";
import path from "path";

const REPORTS_BASE_PATH = process.env.QUANT_BASE_PATH || "./sample_data";

// Supported languages
const SUPPORTED_LANGUAGES = ["en", "zh", "ko", "ja"] as const;
type Language = typeof SUPPORTED_LANGUAGES[number];

// Get report file path based on language
function getReportPath(ticker: string, variant: string, date: string, lang: Language): string {
  if (lang === "en") {
    // English: /Volumes/Data/quant/reports_10/{date}/{TICKER}.en.md
    return path.join(REPORTS_BASE_PATH, `reports_${variant}`, date, `${ticker.toUpperCase()}.en.md`);
  } else {
    // Translations: /Volumes/Data/quant/reports/{date}/{TICKER}_{variant}_{lang}.md
    return path.join(REPORTS_BASE_PATH, "reports", date, `${ticker.toUpperCase()}_${variant}_${lang}.md`);
  }
}

// Check which languages are available for a report
function getAvailableLanguages(ticker: string, variant: string, date: string): Language[] {
  const available: Language[] = [];
  for (const lang of SUPPORTED_LANGUAGES) {
    const filePath = getReportPath(ticker, variant, date, lang);
    if (fs.existsSync(filePath)) {
      available.push(lang);
    }
  }
  return available;
}

// Get verdicts for a ticker on a specific date
function getVerdicts(ticker: string, date: string): { verdict10: string | null; verdict20: string | null } {
  const result = db.prepare(`
    SELECT
      MAX(CASE WHEN mrs = 10 THEN verdict END) as verdict_10,
      MAX(CASE WHEN mrs = 20 THEN verdict END) as verdict_20
    FROM l3_contracts
    WHERE ticker = ? AND trading_date = ?
  `).get(ticker.toUpperCase(), date) as { verdict_10: string | null; verdict_20: string | null } | undefined;

  return {
    verdict10: result?.verdict_10 || null,
    verdict20: result?.verdict_20 || null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const searchParams = request.nextUrl.searchParams;
  const variant = searchParams.get("variant") || "10"; // "10" or "20"
  const date = searchParams.get("date") || getLatestTradingDate();
  const lang = (searchParams.get("lang") || "en") as Language;

  // Validate variant
  if (variant !== "10" && variant !== "20") {
    return NextResponse.json(
      { error: "Invalid variant. Must be '10' or '20'" },
      { status: 400 }
    );
  }

  // Validate language
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return NextResponse.json(
      { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(", ")}` },
      { status: 400 }
    );
  }

  // Get file path based on language
  const filePath = getReportPath(ticker, variant, date, lang);

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // If requested language not found, return 404 with available languages
      const availableLanguages = getAvailableLanguages(ticker, variant, date);
      return NextResponse.json(
        {
          error: "Report not found",
          ticker,
          variant,
          date,
          lang,
          availableLanguages
        },
        { status: 404 }
      );
    }

    // Read the markdown file
    const content = fs.readFileSync(filePath, "utf-8");

    // Get verdicts for this date
    const verdicts = getVerdicts(ticker, date);

    // Get available languages for this report
    const availableLanguages = getAvailableLanguages(ticker, variant, date);

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      variant,
      date,
      lang,
      content,
      verdict10: verdicts.verdict10,
      verdict20: verdicts.verdict20,
      availableLanguages,
    });
  } catch (error) {
    console.error("Error reading report:", error);
    return NextResponse.json(
      { error: "Failed to read report" },
      { status: 500 }
    );
  }
}
