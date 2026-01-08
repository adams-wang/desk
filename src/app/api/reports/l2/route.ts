import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getLatestTradingDate } from "@/lib/queries/trading-days";

const QUANT_PATH = process.env.QUANT_BASE_PATH || "./sample_data";

type Language = "en" | "zh" | "ko" | "ja";

// File name patterns for each language
const FILE_PATTERNS: Record<Language, string[]> = {
  en: [
    "L2_Sector_Analysis.md",
    "L2_Sector_Rotation.md",
    "L2-Sector-Rotation.md",
    "l2.md",
  ],
  zh: [
    "L2_Sector_Analysis.zh.md",
    "L2_Sector_Rotation.zh.md",
    "L2-Sector-Rotation.zh.md",
    "l2.zh.md",
  ],
  ko: [
    "L2_Sector_Analysis.ko.md",
    "L2_Sector_Rotation.ko.md",
    "L2-Sector-Rotation.ko.md",
    "l2.ko.md",
  ],
  ja: [
    "L2_Sector_Analysis.ja.md",
    "L2_Sector_Rotation.ja.md",
    "L2-Sector-Rotation.ja.md",
    "l2.ja.md",
  ],
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || getLatestTradingDate();
    const lang = (searchParams.get("lang") as Language) || "en";

    // Check which languages are available
    const availableLanguages: Language[] = [];

    for (const [language, names] of Object.entries(FILE_PATTERNS) as [Language, string[]][]) {
      for (const name of names) {
        const reportPath = join(QUANT_PATH, "reports", date, name);
        if (existsSync(reportPath)) {
          availableLanguages.push(language);
          break;
        }
      }
    }

    // Get the requested language content
    const names = FILE_PATTERNS[lang] || FILE_PATTERNS.en;
    let content: string | null = null;
    let foundPath: string | null = null;

    for (const name of names) {
      const reportPath = join(QUANT_PATH, "reports", date, name);
      if (existsSync(reportPath)) {
        content = readFileSync(reportPath, "utf-8");
        foundPath = reportPath;
        break;
      }
    }

    if (!content) {
      return NextResponse.json(
        { error: "Report not found", date, availableLanguages },
        { status: 404 }
      );
    }

    return NextResponse.json({
      date,
      lang,
      path: foundPath,
      content,
      availableLanguages,
    });
  } catch (error) {
    console.error("Error fetching L2 report:", error);
    return NextResponse.json(
      { error: "Failed to fetch L2 report" },
      { status: 500 }
    );
  }
}
