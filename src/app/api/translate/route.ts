import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const QUANT_BASE_PATH = "/Volumes/Data/quant";
const REPORTS_BASE_PATH = QUANT_BASE_PATH;
const L10N_CONFIG_PATH = path.join(QUANT_BASE_PATH, "cli/intel/common/l10n.json");

// GLM API Configuration
const GLM_API_KEY = process.env.GLM_API_KEY || process.env.ZHIPU_API_KEY;

// L10n config type
interface L10nConfig {
  prompt_template: string;
  models: Record<string, { name: string; api_name: string; timeout: number }>;
  default_model: string;
  api_endpoint: string;
  languages: Record<string, { name: string; terms: Record<string, string> }>;
}

// Load config from quant's l10n.json (single source of truth)
function loadConfig(): L10nConfig {
  if (!fs.existsSync(L10N_CONFIG_PATH)) {
    throw new Error(`L10n config not found: ${L10N_CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(L10N_CONFIG_PATH, "utf-8"));
}

// Get English report path
function getEnglishReportPath(ticker: string, variant: string, date: string): string {
  return path.join(REPORTS_BASE_PATH, `reports_${variant}`, date, `${ticker.toUpperCase()}.en.md`);
}

// Get translated report path
function getTranslatedReportPath(ticker: string, variant: string, date: string, lang: string): string {
  return path.join(REPORTS_BASE_PATH, "reports", date, `${ticker.toUpperCase()}_${variant}_${lang}.md`);
}

// Generate translation system prompt
function getTranslationPrompt(config: L10nConfig, lang: string): string {
  const langConfig = config.languages[lang];
  if (!langConfig) {
    throw new Error(`Unsupported language: ${lang}`);
  }

  const termsList = Object.entries(langConfig.terms)
    .map(([en, local]) => `   - ${en} → ${local}`)
    .join("\n");

  return config.prompt_template.replace("{language_name}", langConfig.name).replace("{terms_list}", termsList);
}

interface TranslateResult {
  status: "success" | "error";
  translation?: string;
  error?: string;
  latency_sec?: number;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  mode?: string;
}

// Translate using GLM API with streaming
async function translateWithGLM(config: L10nConfig, text: string, targetLang: string): Promise<TranslateResult> {
  if (!GLM_API_KEY) {
    return {
      status: "error",
      error: "GLM_API_KEY not set. Export GLM_API_KEY or ZHIPU_API_KEY environment variable.",
    };
  }

  if (!config.languages[targetLang]) {
    return {
      status: "error",
      error: `Unsupported language: ${targetLang}. Use: ${Object.keys(config.languages).join(", ")}`,
    };
  }

  const modelConfig = config.models[config.default_model];
  const systemPrompt = getTranslationPrompt(config, targetLang);
  const startTime = Date.now();

  try {
    const response = await fetch(config.api_endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelConfig.api_name,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        max_tokens: 16384,
        temperature: 0.3,
        thinking: { type: "disabled" },
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = errorText;
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData.error?.message || errorText.slice(0, 200);
      } catch {
        // Use raw text
      }
      return {
        status: "error",
        error: `HTTP ${response.status}: ${errorMsg}`,
      };
    }

    // Parse SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      return { status: "error", error: "No response body" };
    }

    const decoder = new TextDecoder();
    let fullContent = "";
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        if (line.startsWith("data:")) {
          const dataStr = line.slice(5).trim();

          if (dataStr === "[DONE]") {
            break;
          }

          try {
            const data = JSON.parse(dataStr);
            const choices = data.choices || [];
            if (choices.length > 0) {
              const delta = choices[0].delta || {};
              const content = delta.content || "";
              if (content) {
                fullContent += content;
              }

              // Final chunk contains usage stats
              if (choices[0].finish_reason && data.usage) {
                usage = data.usage;
              }
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    }

    const latency = (Date.now() - startTime) / 1000;

    return {
      status: "success",
      translation: fullContent,
      latency_sec: Math.round(latency * 100) / 100,
      tokens: {
        input: usage.prompt_tokens || 0,
        output: usage.completion_tokens || 0,
        total: usage.total_tokens || 0,
      },
      mode: "stream",
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
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
      return NextResponse.json({ error: "Invalid variant. Must be '10' or '20'" }, { status: 400 });
    }

    // Check if translation already exists
    const translatedPath = getTranslatedReportPath(ticker, variant, date, lang);
    if (fs.existsSync(translatedPath)) {
      return NextResponse.json({ error: "Translation already exists", path: translatedPath }, { status: 409 });
    }

    // Get English source report
    const englishPath = getEnglishReportPath(ticker, variant, date);
    if (!fs.existsSync(englishPath)) {
      return NextResponse.json({ error: "English source report not found", path: englishPath }, { status: 404 });
    }

    const englishContent = fs.readFileSync(englishPath, "utf-8");

    // Load config and translate using GLM API
    const config = loadConfig();
    const result = await translateWithGLM(config, englishContent, lang);

    if (result.status === "error") {
      return NextResponse.json({ error: result.error }, { status: 500 });
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
    return NextResponse.json({ error: "Failed to translate report" }, { status: 500 });
  }
}
