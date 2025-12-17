import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const QUANT_BASE_PATH = "/Volumes/Data/quant";
const L10N_CONFIG_PATH = path.join(QUANT_BASE_PATH, "cli", "intel", "common", "l10n.json");
const REPORTS_BASE_PATH = QUANT_BASE_PATH;

// Types for l10n config
interface L10nConfig {
  prompt_template: string;
  models: Record<string, {
    name: string;
    api_name: string;
    desc: string;
    timeout: number;
  }>;
  default_model: string;
  api_endpoint: string;
  languages: Record<string, {
    name: string;
    terms: Record<string, string>;
  }>;
}

// Load l10n config
function loadL10nConfig(): L10nConfig {
  if (!fs.existsSync(L10N_CONFIG_PATH)) {
    throw new Error(`L10n config not found: ${L10N_CONFIG_PATH}`);
  }
  const content = fs.readFileSync(L10N_CONFIG_PATH, "utf-8");
  return JSON.parse(content);
}

// Get English report path
function getEnglishReportPath(ticker: string, variant: string, date: string): string {
  return path.join(REPORTS_BASE_PATH, `reports_${variant}`, date, `${ticker.toUpperCase()}.en.md`);
}

// Get translated report path
function getTranslatedReportPath(ticker: string, variant: string, date: string, lang: string): string {
  return path.join(REPORTS_BASE_PATH, "reports", date, `${ticker.toUpperCase()}_${variant}_${lang}.md`);
}

// Generate translation prompt
function getTranslationPrompt(config: L10nConfig, lang: string): string {
  const langConfig = config.languages[lang];
  if (!langConfig) {
    throw new Error(`Unsupported language: ${lang}`);
  }

  const termsList = Object.entries(langConfig.terms)
    .map(([en, local]) => `   - ${en} → ${local}`)
    .join("\n");

  return config.prompt_template
    .replace("{language_name}", langConfig.name)
    .replace("{terms_list}", termsList);
}

// Call Zhipu GLM API
async function translateWithGLM(
  config: L10nConfig,
  text: string,
  targetLang: string,
  model: string = config.default_model
): Promise<{ status: "success" | "error"; translation?: string; error?: string; latency_sec?: number }> {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    return { status: "error", error: "GLM_API_KEY not configured" };
  }

  const modelConfig = config.models[model] || config.models[config.default_model];
  const systemPrompt = getTranslationPrompt(config, targetLang);

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), modelConfig.timeout * 1000);

    const response = await fetch(config.api_endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelConfig.api_name,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = (Date.now() - startTime) / 1000;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
      return { status: "error", error: errorMsg };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";

    return {
      status: "success",
      translation: content,
      latency_sec: Math.round(latency * 100) / 100,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { status: "error", error: `Request timed out after ${modelConfig.timeout}s` };
    }
    return { status: "error", error: String(error) };
  }
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

    // Load config
    const config = loadL10nConfig();

    // Validate language
    if (!config.languages[lang]) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${Object.keys(config.languages).join(", ")}` },
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

    // Translate using GLM API
    const result = await translateWithGLM(config, englishContent, lang);

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
