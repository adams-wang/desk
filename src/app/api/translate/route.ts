import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const QUANT_BASE_PATH = "/Volumes/Data/quant";
const REPORTS_BASE_PATH = QUANT_BASE_PATH;

// Get English report path
function getEnglishReportPath(ticker: string, variant: string, date: string): string {
  return path.join(REPORTS_BASE_PATH, `reports_${variant}`, date, `${ticker.toUpperCase()}.en.md`);
}

// Get translated report path
function getTranslatedReportPath(ticker: string, variant: string, date: string, lang: string): string {
  return path.join(REPORTS_BASE_PATH, "reports", date, `${ticker.toUpperCase()}_${variant}_${lang}.md`);
}

// Call quant's Python l10n module directly
async function translateWithQuant(
  text: string,
  targetLang: string
): Promise<{ status: "success" | "error"; translation?: string; error?: string; latency_sec?: number }> {
  return new Promise((resolve) => {
    const pythonScript = `
import sys
import json
sys.path.insert(0, "${QUANT_BASE_PATH}")
from cli.intel.common.l10n import translate_report_stream

result = translate_report_stream(sys.stdin.read(), "${targetLang}")
print(json.dumps(result))
`;

    const startTime = Date.now();
    const python = spawn("python3", ["-c", pythonScript], {
      cwd: QUANT_BASE_PATH,
      env: { ...process.env, PYTHONPATH: QUANT_BASE_PATH },
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    python.on("close", (code) => {
      const latency = (Date.now() - startTime) / 1000;

      if (code !== 0) {
        resolve({ status: "error", error: stderr || `Python exited with code ${code}` });
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve({
          ...result,
          latency_sec: result.latency_sec || Math.round(latency * 100) / 100,
        });
      } catch {
        resolve({ status: "error", error: `Failed to parse Python output: ${stdout}` });
      }
    });

    python.on("error", (err) => {
      resolve({ status: "error", error: `Failed to spawn Python: ${err.message}` });
    });

    // Send the text to translate via stdin
    python.stdin.write(text);
    python.stdin.end();
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker, variant, date, lang } = body;

    // Validate required parameters
    if (!ticker || !variant || !date || !lang) {
      return NextResponse.json(
        { error: "Missing required parameters: ticker, variant, date, lang" },
        { status: 400 }
      );
    }

    // Validate variant
    if (variant !== "10" && variant !== "20") {
      return NextResponse.json(
        { error: "Invalid variant. Must be '10' or '20'" },
        { status: 400 }
      );
    }

    // Check if translation already exists
    const translatedPath = getTranslatedReportPath(ticker, variant, date, lang);
    if (fs.existsSync(translatedPath)) {
      return NextResponse.json(
        { error: "Translation already exists", path: translatedPath },
        { status: 409 }
      );
    }

    // Get English source report
    const englishPath = getEnglishReportPath(ticker, variant, date);
    if (!fs.existsSync(englishPath)) {
      return NextResponse.json(
        { error: "English source report not found", path: englishPath },
        { status: 404 }
      );
    }

    const englishContent = fs.readFileSync(englishPath, "utf-8");

    // Translate using quant's Python module (streaming mode)
    const result = await translateWithQuant(englishContent, lang);

    if (result.status === "error") {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Ensure output directory exists
    const outputDir = path.dirname(translatedPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write translated report
    fs.writeFileSync(translatedPath, result.translation!, "utf-8");

    return NextResponse.json({
      status: "success",
      ticker: ticker.toUpperCase(),
      variant,
      date,
      lang,
      path: translatedPath,
      latency_sec: result.latency_sec,
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Failed to translate report" },
      { status: 500 }
    );
  }
}
