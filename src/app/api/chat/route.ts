import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getMarketOverview, getL1Contract, getL1ContractFull, getIndices } from "@/lib/queries/market";
import {
  getStockDetail,
  getStockList,
  searchStocks,
  getL3Contracts,
  getAnalystActions,
  getAnalystTargets,
  getStockOHLCVExtended,
  getMRSHistory,
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
    name: "get_stocks_by_verdict",
    description:
      "Get a list of stocks filtered by their trading verdict (BUY or SELL). These are AI-generated trading signals. Use this to find bullish or bearish stocks.",
    input_schema: {
      type: "object" as const,
      properties: {
        verdict: {
          type: "string",
          enum: ["BUY", "SELL"],
          description: "Filter by trading verdict - BUY for bullish signals, SELL for bearish",
        },
        timeframe: {
          type: "string",
          enum: ["10", "20"],
          description: "Timeframe for the verdict - 10 for short-term (10-day), 20 for medium-term (20-day). Default is 10.",
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
      required: ["verdict"],
    },
  },
  {
    name: "get_l3_contracts",
    description:
      "Get the full trading plan for a stock, including entry price, stop loss, target price, risk/reward ratio, conviction level, and position sizing. This provides detailed trading guidance.",
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
    name: "get_top_movers",
    description:
      "Get stocks with the strongest momentum (highest MRS scores) or weakest momentum (lowest MRS scores). MRS (Momentum Rank Score) measures relative strength.",
    input_schema: {
      type: "object" as const,
      properties: {
        direction: {
          type: "string",
          enum: ["strongest", "weakest"],
          description: "Get strongest (highest MRS) or weakest (lowest MRS) stocks",
        },
        limit: {
          type: "number",
          description: "Number of stocks to return. Default is 10.",
        },
        date: {
          type: "string",
          description: "Optional date in YYYY-MM-DD format. Defaults to latest trading date.",
        },
      },
      required: ["direction"],
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
];

// System prompt with trading context
const SYSTEM_PROMPT = `You are an AI trading advisor for a US equity quant trading dashboard. You have access to real-time market data, stock analysis tools, AND internet search for current news and information.

Key concepts you should understand:
- **Regime**: Market condition - RISK_ON (aggressive), NORMAL (standard), RISK_OFF (defensive), CRISIS (avoid)
- **MRS (Momentum Rank Score)**: Percentile rank of a stock's momentum vs peers. Higher = stronger momentum. Different lookback periods (5/10/20 days).
- **Trading Verdict**: AI-generated signal - BUY, SELL, or HOLD. Comes with conviction level (HIGH/MEDIUM/LOW).
- **Trading Plan**: Full trade setup with entry price, stop loss, target price, risk/reward ratio, and position sizing.
- **Position Cap**: Maximum position size allowed by current regime (e.g., 120% = slightly aggressive)
- **VIX**: Volatility index - below 15 is calm, 15-20 normal, 20-25 elevated, above 25 high fear

IMPORTANT: Never use technical jargon like "L3" or "L1" when talking to users. Use plain English terms like "trading signal", "trading plan", "market regime" instead.

When answering:
1. Be concise but informative
2. Use actual data from the tools - don't make up numbers
3. Explain signals in plain English
4. Highlight risks when relevant
5. Format numbers nicely (e.g., percentages with 1-2 decimals)
6. Use web_search for current news, earnings, announcements, or any real-time information not in the database

Remember: You are providing analysis, not financial advice. Always encourage the user to do their own research.`;

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

      case "get_stocks_by_verdict": {
        const verdict = (input.verdict as string).toUpperCase();
        const timeframe = (input.timeframe as string) || "10";
        const limit = (input.limit as number) || 20;
        const date = (input.date as string) || undefined;

        const allStocks = getStockList(1000, date);
        const filtered = allStocks
          .filter((s) => {
            const v = timeframe === "10" ? s.verdict_10 : s.verdict_20;
            return v?.toUpperCase() === verdict;
          })
          .slice(0, limit)
          .map((s) => ({
            ticker: s.ticker,
            company_name: s.company_name,
            close: s.close,
            mrs_20: s.mrs_20,
            verdict_10: s.verdict_10,
            verdict_20: s.verdict_20,
            sector: s.sector,
          }));

        if (filtered.length === 0) return `No stocks with ${verdict} verdict found.`;
        return JSON.stringify(filtered, null, 2);
      }

      case "get_l3_contracts": {
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

      case "get_top_movers": {
        const direction = input.direction as string;
        const limit = (input.limit as number) || 10;
        const date = (input.date as string) || undefined;

        const allStocks = getStockList(1000, date);
        const sorted = [...allStocks]
          .filter((s) => s.mrs_20 !== null)
          .sort((a, b) => {
            if (direction === "strongest") {
              return (b.mrs_20 ?? 0) - (a.mrs_20 ?? 0);
            }
            return (a.mrs_20 ?? 0) - (b.mrs_20 ?? 0);
          })
          .slice(0, limit)
          .map((s) => ({
            ticker: s.ticker,
            company_name: s.company_name,
            close: s.close,
            mrs_20: s.mrs_20,
            verdict_10: s.verdict_10,
            verdict_20: s.verdict_20,
            sector: s.sector,
          }));

        return JSON.stringify(sorted, null, 2);
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
