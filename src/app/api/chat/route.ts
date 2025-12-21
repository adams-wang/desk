import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getMarketOverview, getL1Contract, getL1ContractFull, getIndices, getL2Contract } from "@/lib/queries/market";
import {
  getStockDetail,
  searchStocks,
  getL3Contracts,
  getAnalystActions,
  getAnalystTargets,
  getStockOHLCVExtended,
  getMRSHistory,
  findStockEdge,
  type EdgeFilterType,
} from "@/lib/queries/stocks";
import { getLatestTradingDate } from "@/lib/queries/trading-days";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
  {
    name: "get_market_overview",
    description:
      "Get comprehensive market analysis including: regime (RISK_ON/NORMAL/RISK_OFF/CRISIS), macro summary (AI-generated market context), news themes, VIX interpretation, yield curve analysis, breadth analysis, conflicts/divergences, guidance with key action, risk factors, and upgrade/downgrade triggers. This is the PRIMARY tool for understanding current market conditions.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "Optional date in YYYY-MM-DD format. Defaults to latest trading date.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_stock_detail",
    description:
      "Get comprehensive multi-day stock analysis (last 5 days) including: OHLCV, momentum trajectory (MRS 5/10/20), technicals (RSI, MACD, SMAs), gaps, OFD patterns, candle patterns, volume analysis, sector/industry. Independent of L3 verdicts - provides raw data for analysis.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Stock ticker symbol (e.g., AAPL, MSFT, GOOGL)",
        },
        date: {
          type: "string",
          description: "Optional date in YYYY-MM-DD format. Defaults to latest trading date.",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "search_stocks",
    description: "Search for stocks by ticker prefix or company name. Use this when you need to find stock tickers.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query - can be a ticker prefix or part of company name",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Default is 20.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "find_stock_edge",
    description:
      "Find stocks with proven trading edge based on backtested dual-signal patterns. Use this to discover opportunities with 60%+ historical win rates. Patterns include: dual_buy (both timeframes agree), rebound (recovered signal - highest edge at 64.6%), early_entry (fresh short-term signal), high_conviction, or momentum-based (strongest/weakest).",
    input_schema: {
      type: "object" as const,
      properties: {
        filter: {
          type: "string",
          enum: ["dual_buy", "rebound", "early_entry", "high_conviction", "prefer", "strongest", "weakest"],
          description: "Filter type: dual_buy (both V10+V20 BUY), rebound (+-+ pattern, 64.6% win), early_entry (fresh V10 signal), high_conviction (HIGH conviction), prefer (any PREFER pattern), strongest/weakest (by momentum)",
        },
        limit: {
          type: "number",
          description: "Maximum number of stocks to return. Default is 20.",
        },
        date: {
          type: "string",
          description: "Optional date in YYYY-MM-DD format. Defaults to latest trading date.",
        },
      },
      required: ["filter"],
    },
  },
  {
    name: "get_trading_plan",
    description:
      "Get the complete trading plan for a specific stock including: entry price, stop loss, target price, risk/reward ratio, thesis (STRENGTH/VALUE/REVERSION), conviction level, position sizing, key risks, and catalysts.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Stock ticker symbol",
        },
        date: {
          type: "string",
          description: "Optional date in YYYY-MM-DD format. Defaults to latest trading date.",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_analyst_sentiment",
    description:
      "Get recent analyst actions (upgrades, downgrades, initiations) and price target changes for a stock. Useful for understanding Wall Street sentiment.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Stock ticker symbol",
        },
        date: {
          type: "string",
          description: "Optional date in YYYY-MM-DD format. Defaults to latest trading date.",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the internet for current news, company announcements, market analysis, and other real-time information. Use this for stock news, earnings reports, SEC filings, market commentary, and any information not in the database.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query. Be specific, e.g., 'NVDA earnings Q4 2024' or 'Tesla stock news today'",
        },
        search_depth: {
          type: "string",
          enum: ["basic", "advanced"],
          description: "Search depth - 'basic' for quick results, 'advanced' for more comprehensive search. Default is 'basic'.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_sector_rotation",
    description:
      "Get sector rotation analysis including: all 11 sector rankings (1-11), signals (IGNITION/TREND/NEUTRAL/WEAKENING/AVOID/TOXIC/RECOVERY), position modifiers (0.25x-1.5x), cycle phase (EARLY_EXPANSION/MID_EXPANSION/LATE_EXPANSION/CONTRACTION), and rotation bias (OFFENSIVE/NEUTRAL/DEFENSIVE). Use this to understand which sectors to overweight/underweight and where we are in the market cycle.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "Optional date in YYYY-MM-DD format. Defaults to latest trading date.",
        },
      },
      required: [],
    },
  },
];

// System prompt with trading context
const SYSTEM_PROMPT = `You are an elite US equity analyst with institutional quant expertise and real-money trading execution precision. You combine rigorous quantitative analysis with AI-native intelligence. Every analysis you produce is for real capital—no ambiguity, no circular logic, no analysis paralysis.

## CORE PRINCIPLES

1. **First Principles**: Fix root causes, never symptoms. Be 100% honest, professional, objective.
2. **Classify Thesis FIRST**: STRENGTH / VALUE / REVERSION / PARABOLIC / NEUTRAL → Apply matching framework ONLY.
3. **No Circular Logic**: If "wait for X" leads to "X happened, now wait for Y" → STOP. Decide now.
4. **Forced Decision**: Every analysis ends with BUY/HOLD/SELL + conviction + position guidance.
5. **Actionable Output**: Include specific numbers when relevant (price levels, percentages, risk).

## 4-LAYER INTEL SYSTEM

You have access to a production quant system with four analysis layers:

**L1 - Market Analysis (get_market_overview)**
- Regime: RISK_ON / NORMAL / RISK_OFF / CRISIS
- Hard blockers: VIX > 35, Sahm Rule ≥ 0.50pp, FOMC < 3 days
- Position modifier: 25% (crisis) to 150% (risk-on)
- VIX interpretation, yield curve, breadth analysis

**L2 - Sector Rotation (get_sector_rotation)**
- 11 sectors ranked by relative strength (MRS_20)
- 9 signals based on MRS_5 state:
  - RECOVERY_STRONG (1.5x, 89% win) - toxic zone recovering
  - IGNITION (1.2x, 62% win) - ignition zone with momentum
  - TREND/MOMENTUM (1.2x) - positive zones
  - NEUTRAL (1.0x) - noise zone
  - WEAKENING (0.75x, 67% win) - warning signal
  - AVOID (0.5x) / TOXIC (0.25x) - underperform
- Cycle phase: EARLY_EXPANSION → MID → LATE → CONTRACTION

**L3 - Stock Selection (find_stock_edge, get_stock_detail, get_trading_plan)**
- Dual MRS system: 10-day (early signals) + 20-day (standard)
- 3-day pattern recognition with backtested win rates:
  - REBOUND (+-+): 64.6% win - highest edge
  - PERSISTENT (+++): 58.2% win
  - FRESH (--+): 57.4% win
  - CONFIRMED (-++): 55.2% win
  - FADING (++-): AVOID
- Trading plans: entry, stop-loss, target, risk/reward

**L4 - Risk Management (Hard Rules)**
- Risk per trade: 1% max
- Portfolio heat: 6% max
- Sector exposure: 40% max
- Position sizing: L1 modifier × L2 modifier (floor 30%, cap 150%)

## THESIS CLASSIFICATION (MANDATORY FIRST)

| Thesis | Core Signal | Horizon | Key Metrics |
|--------|-------------|---------|-------------|
| **STRENGTH** | MRS_20 4-10%, momentum | 5-20d | MRS range, tech score |
| **VALUE** | PEG < 1.5, fundamentals | 20-60d | Net income > 0, not distressed |
| **REVERSION** | RSI < 30, bounce proof | 3-10d | 6 quality gates |
| **PARABOLIC** | MRS > 10%, extreme | 1-5d | Risk management focus |
| **NEUTRAL** | No clear thesis | N/A | Watchlist only |

Never reject a value thesis with momentum rules (or vice versa).

## ANTI-PARALYSIS CHECK

Before recommending "wait":
1. What specific condition am I waiting for?
2. If it occurs, will price be higher?
3. Will I then say "too expensive, wait for pullback"?
4. If YES to #3 → Circular logic. DECIDE NOW.

## FORCED DECISION FORMAT

Every stock analysis should conclude with:
- **VERDICT**: BUY / HOLD / SELL / AVOID
- **THESIS**: STRENGTH / VALUE / REVERSION / PARABOLIC / NEUTRAL
- **CONVICTION**: High / Medium / Low
- **POSITION**: Full / 75% / 50% / 25% / None

## COMMUNICATION STYLE

- Use plain English, not quant jargon ("trading signal" not "L3 verdict")
- Be concise but complete
- Always use actual data from tools—never fabricate numbers
- Highlight risks prominently
- Format numbers cleanly (percentages with 1-2 decimals)
- Use web_search for current news, earnings, or real-time information

## DISCLAIMER

You provide analysis based on quantitative signals and market data. This is not personalized financial advice. Users should conduct their own research and consider their risk tolerance before trading.`;

// Tool execution handlers
async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "get_market_overview": {
        const date = (input.date as string) || undefined;

        // Get rich L1 contract data from JSON file
        const l1Full = getL1ContractFull(date);
        if (!l1Full) return "No market data available for the specified date.";

        // Get index performance
        const indices = getIndices(date);

        // Return comprehensive market overview
        const overview = {
          tradingDate: l1Full.tradingDate,

          // Core regime info
          regime: l1Full.regime,
          regimeTransition: l1Full.regimeTransition,
          confidence: l1Full.confidence,
          confidenceScore: l1Full.confidenceScore,

          // PRIMARY: AI-generated market summary
          macroSummary: l1Full.macroSummary,

          // News context
          newsThemes: l1Full.newsContext?.keyThemes || [],
          marketImplications: l1Full.newsContext?.marketImplications || "",
          newsRiskAdjustment: l1Full.newsRiskAdjustment,

          // Signal interpretations (human-readable)
          vix: {
            value: l1Full.signals?.vixValue,
            bucket: l1Full.signals?.vixBucket,
            interpretation: l1Full.signals?.vixInterpretation,
          },
          yieldCurve: {
            spreadBps: l1Full.signals?.yieldSpreadBps,
            shape: l1Full.signals?.yieldShape,
            interpretation: l1Full.signals?.yieldInterpretation,
          },
          breadth: {
            pct: l1Full.signals?.breadthPct,
            interpretation: l1Full.signals?.breadthInterpretation,
          },
          economic: {
            fedFunds: l1Full.signals?.fedFunds,
            cpiYoy: l1Full.signals?.cpiYoy,
            unemployment: l1Full.signals?.unemployment,
            interpretation: l1Full.signals?.economicInterpretation,
          },

          // Conflicts and divergences
          conflicts: l1Full.conflicts,

          // Guidance
          guidance: l1Full.guidance,

          // Triggers
          triggers: l1Full.triggers,

          // Risk factors
          riskFactors: l1Full.riskFactors,

          // Hard blocks
          hardBlocks: l1Full.hardBlocks,

          // Index performance
          indices: indices.map(i => ({
            name: i.name,
            close: i.close,
            changePct: i.changePct.toFixed(2) + "%",
          })),
        };

        return JSON.stringify(overview, null, 2);
      }

      case "get_stock_detail": {
        const ticker = input.ticker as string;
        const date = (input.date as string) || undefined;

        // Get current day detail
        const detail = getStockDetail(ticker, date);
        if (!detail) return `No data found for ticker ${ticker.toUpperCase()}.`;

        // Get 5-day extended OHLCV with all indicators
        const extendedData = getStockOHLCVExtended(ticker, 5, date);

        // Get MRS trajectory
        const mrsHistory = getMRSHistory(ticker, 5, date);

        // Build comprehensive multi-day response
        const response = {
          // Basic info
          ticker: detail.ticker,
          companyName: detail.company_name,
          sector: detail.sector,
          industry: detail.industry,
          tradingDate: detail.date,

          // Current day summary
          current: {
            price: detail.close,
            change: detail.prev_close ? ((detail.close - detail.prev_close) / detail.prev_close * 100).toFixed(2) + "%" : null,
            volume: detail.volume,
            volumeVsAvg: detail.volume_10_ts ? `${detail.volume_10_ts}th percentile` : null,
          },

          // Momentum (current)
          momentum: {
            mrs5: detail.mrs_5,
            mrs10: detail.mrs_10,
            mrs20: detail.mrs_20,
            mrs20Percentile: detail.mrs_20_cs,
          },

          // Technicals (current)
          technicals: {
            rsi14: detail.rsi_14,
            macd: detail.macd,
            macdSignal: detail.macd_signal,
            atr14: detail.atr_14,
          },

          // Risk metrics
          risk: {
            beta: detail.beta_60,
            volatility20d: detail.volatility_20,
            sharpeRatio20d: detail.sharpe_ratio_20,
            alpha20d: detail.alpha_20d,
          },

          // Today's patterns and signals
          patterns: {
            gap: detail.gap_type ? {
              type: detail.gap_type,
              conclusion: detail.gap_conclusion,
              interpretation: detail.gap_interpretation,
            } : null,
            ofd: detail.ofd_code ? {
              code: detail.ofd_code,
              conclusion: detail.ofd_conclusion,
            } : null,
            candle: detail.pattern ? {
              pattern: detail.pattern,
              conclusion: detail.pattern_conclusion,
              interpretation: detail.pattern_interpretation,
            } : null,
          },

          // 5-day trajectory (T-4 to T-0, chronological)
          trajectory: {
            ohlcv: extendedData.map(d => ({
              date: d.date,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
              volume: d.volume,
              volumeVsAvg: d.volume_10_ts ? `${d.volume_10_ts}th pct` : null,
            })),
            mrs: mrsHistory.map(d => ({
              date: d.date,
              mrs5: d.mrs_5,
              mrs10: d.mrs_10,
              mrs20: d.mrs_20,
            })),
            technicals: extendedData.map(d => ({
              date: d.date,
              rsi14: d.rsi_14,
              macdLine: d.macd_line,
              macdSignal: d.macd_signal,
              sma20: d.sma_20,
              sma50: d.sma_50,
              sma200: d.sma_200,
            })),
            patterns: extendedData.map(d => ({
              date: d.date,
              ofd: d.ofd_code,
              ofdConclusion: d.ofd_conclusion,
              pattern: d.pattern,
              patternConclusion: d.pattern_conclusion,
              gap: d.gap_type,
              gapConclusion: d.gap_conclusion,
            })),
          },

          // Dual MRS interpretation (3-day verdict pattern)
          dualMrs: detail.dual_conclusion ? {
            v10Pattern: detail.v10_pattern,
            v20Pattern: detail.v20_pattern,
            conclusion: detail.dual_conclusion,
            winRate10d: detail.dual_win_pct_10d,
            avgReturn10d: detail.dual_ret_pct_10d,
            interpretation: detail.dual_interpretation,
          } : null,
        };

        return JSON.stringify(response, null, 2);
      }

      case "search_stocks": {
        const query = input.query as string;
        const limit = (input.limit as number) || 20;
        const results = searchStocks(query, limit);
        if (results.length === 0) return `No stocks found matching "${query}".`;
        return JSON.stringify(results, null, 2);
      }

      case "find_stock_edge": {
        const filter = (input.filter as EdgeFilterType) || "prefer";
        const limit = (input.limit as number) || 20;
        const date = (input.date as string) || undefined;

        const results = findStockEdge(filter, limit, date);

        if (results.length === 0) {
          return `No stocks found matching "${filter}" edge criteria.`;
        }

        // Format response with edge context
        const formatted = results.map((s) => ({
          ticker: s.ticker,
          company_name: s.company_name,
          sector: s.sector,
          close: s.close,
          momentum: {
            mrs_5: s.mrs_5,
            mrs_20: s.mrs_20,
          },
          signals: {
            verdict_10: s.verdict_10,
            verdict_20: s.verdict_20,
            conviction_10: s.conviction_10,
            conviction_20: s.conviction_20,
          },
          edge: {
            v10_pattern: s.v10_pattern,
            v20_pattern: s.v20_pattern,
            conclusion: s.edge_conclusion,
            win_rate_10d: s.win_rate_10d ? `${s.win_rate_10d.toFixed(1)}%` : null,
            avg_return_10d: s.avg_return_10d ? `${s.avg_return_10d >= 0 ? "+" : ""}${s.avg_return_10d.toFixed(2)}%` : null,
            interpretation: s.edge_interpretation,
          },
        }));

        return JSON.stringify(formatted, null, 2);
      }

      case "get_trading_plan": {
        const ticker = input.ticker as string;
        const date = (input.date as string) || undefined;
        const contracts = getL3Contracts(ticker, date);
        if (!contracts.l3_10 && !contracts.l3_20) {
          return `No trading plan found for ${ticker.toUpperCase()}.`;
        }
        return JSON.stringify(contracts, null, 2);
      }

      case "get_analyst_sentiment": {
        const ticker = input.ticker as string;
        const date = (input.date as string) || undefined;
        const actions = getAnalystActions(ticker, date);
        const targets = getAnalystTargets(ticker, date);
        return JSON.stringify({ actions, targets }, null, 2);
      }

      case "web_search": {
        const query = input.query as string;
        const searchDepth = (input.search_depth as string) || "basic";

        if (!process.env.TAVILY_API_KEY) {
          return "Web search is not configured. Please add TAVILY_API_KEY to environment variables.";
        }

        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: process.env.TAVILY_API_KEY,
            query,
            search_depth: searchDepth,
            include_answer: true,
            include_raw_content: false,
            max_results: 5,
          }),
        });

        if (!response.ok) {
          return `Web search failed: ${response.statusText}`;
        }

        const data = await response.json();

        // Format results for Claude
        const results = {
          answer: data.answer || null,
          sources: data.results?.map((r: { title: string; url: string; content: string }) => ({
            title: r.title,
            url: r.url,
            snippet: r.content,
          })) || [],
        };

        return JSON.stringify(results, null, 2);
      }

      case "get_sector_rotation": {
        const date = (input.date as string) || undefined;
        const l2 = getL2Contract(date);

        if (!l2) {
          return "No sector rotation data available for the specified date.";
        }

        // Format response with clear structure
        const response = {
          tradingDate: l2.tradingDate,

          // Cycle context
          cycle: {
            phase: l2.cyclePhase,
            confidence: l2.cycleConfidence,
            rotationBias: l2.rotationBias,
            rotationVelocity: l2.rotationVelocity,
          },

          // AI-generated summary
          summary: l2.sectorSummary,

          // Crossover alerts (sectors changing direction)
          crossoverAlerts: l2.crossoverAlerts,

          // All 11 sectors ranked with signals
          sectorRankings: l2.sectorRankings.map((s) => ({
            rank: s.rank,
            sector: s.sectorName,
            etf: s.etf,
            signal: s.signal,
            zone: s.zone,
            modifier: `${s.modifier}x`,
            momentum: {
              mrs20: `${s.mrs20 >= 0 ? "+" : ""}${s.mrs20.toFixed(2)}%`,
              mrs5: `${s.mrs5 >= 0 ? "+" : ""}${s.mrs5.toFixed(2)}%`,
              roc3: `${s.roc3 >= 0 ? "+" : ""}${s.roc3.toFixed(2)}%`,
            },
            rationale: s.rationale,
            news: s.newsContext
              ? {
                  sentiment: s.newsContext.sentiment,
                  articles: s.newsContext.articleCount,
                  themes: s.newsContext.themes,
                }
              : null,
          })),

          // Signal legend for context
          signalLegend: {
            RECOVERY_STRONG: "Toxic zone recovering (1.5x, 89% win rate)",
            RECOVERY_EARLY: "Toxic zone early bounce (1.2x, 62% win rate)",
            IGNITION: "Ignition zone with momentum (1.2x, 62% win rate)",
            TREND: "Positive trend zone (1.2x)",
            MOMENTUM: "Strong momentum zone (1.2x)",
            NEUTRAL: "Noise zone (1.0x)",
            WEAKENING: "Warning - momentum fading (0.75x)",
            AVOID: "Ignition zone without momentum (0.5x)",
            TOXIC: "Deep underperformance (0.25x)",
          },
        };

        return JSON.stringify(response, null, 2);
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    return `Error executing ${name}: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Add current trading date context
    const tradingDate = getLatestTradingDate();
    const l1 = getL1Contract();
    const contextMessage = `[Current trading date: ${tradingDate}, Market regime: ${l1?.regime || "UNKNOWN"}]`;

    // Build messages for Claude
    const claudeMessages: Anthropic.MessageParam[] = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    // Add context to the first user message
    if (claudeMessages.length > 0 && claudeMessages[0].role === "user") {
      claudeMessages[0] = {
        role: "user",
        content: `${contextMessage}\n\n${claudeMessages[0].content}`,
      };
    }

    // Initial Claude request
    let response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: claudeMessages,
    });

    // Handle tool use loop
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Continue conversation with tool results
      claudeMessages.push({
        role: "assistant",
        content: response.content,
      });
      claudeMessages.push({
        role: "user",
        content: toolResults,
      });

      response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools,
        messages: claudeMessages,
      });
    }

    // Extract text response
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    return NextResponse.json({
      content: textBlock?.text || "I apologize, but I couldn't generate a response.",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
