import db from "../db";
import { getLatestTradingDate } from "./trading-days";

// ============================================================================
// Types
// ============================================================================

export interface L1Contract {
  contractId: string;
  tradingDate: string;
  generatedAt: string;
  validUntil: string;
  model: string;
  regime: "RISK_ON" | "NORMAL" | "RISK_OFF" | "CRISIS";
  regimeTransition: "IMPROVING" | "STABLE" | "DETERIORATING" | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  confidenceScore: number;
  vixBucket: string;
  vixValue: number;
  positionPct: number;
  positionBias: string | null;
  hardBlocks: string[];
  yieldSpreadBps: number | null;
  yieldShape: string | null;
  breadthPct: number;
  fomcDaysAway: number | null;
  sahmTriggered: boolean;
  reportPath: string | null;
}

export interface IndexData {
  code: string;
  name: string;
  close: number;
  prevClose: number;
  change: number;
  changePct: number;
}

export interface MarketSentiment {
  putCallRatio: number;
  putVolume: number;
  callVolume: number;
  breadthPct: number;
  breadthAbove: number;
  breadthTotal: number;
  nyseAdRatio: number;
  nyseAdvancing: number;
  nyseDeclining: number;
  sentimentRegime: string;
}

export interface TreasuryYields {
  treasury3m: number;
  treasury5y: number;
  treasury10y: number;
  spread5y10y: number;
  spread3m10y: number;
}

export interface MarketOverview {
  tradingDate: string;
  generatedAt: string;

  // L1 Contract
  regime: L1Contract["regime"];
  regimeTransition: L1Contract["regimeTransition"];
  confidence: L1Contract["confidence"];
  confidenceScore: number;
  positionPct: number;
  positionBias: string | null;

  // VIX
  vix: {
    value: number;
    bucket: string;
  };

  // Breadth
  breadth: {
    pct: number;
    above: number;
    total: number;
  };

  // Blockers
  hardBlocks: string[];
  fomcDaysAway: number | null;
  sahmTriggered: boolean;

  // Indices
  indices: IndexData[];

  // Sentiment
  sentiment: {
    putCallRatio: number;
    nyseAdRatio: number;
  };

  // Yields
  yields: TreasuryYields | null;

  // Report path
  reportPath: string | null;
}

// ============================================================================
// Queries
// ============================================================================

interface L1ContractRow {
  contract_id: string;
  trading_date: string;
  generated_at: string;
  valid_until: string;
  model: string;
  regime: string;
  regime_transition: string | null;
  confidence: string;
  confidence_score: number | null;
  vix_bucket: string;
  vix_value: number | null;
  final_position_pct: number;
  position_bias: string | null;
  hard_blocks: string | null;
  yield_spread_bps: number | null;
  yield_shape: string | null;
  breadth_pct: number | null;
  fomc_days_away: number | null;
  sahm_triggered: number;
  report_path: string | null;
}

/**
 * Get the latest L1 contract
 */
export function getL1Contract(date?: string): L1Contract | null {
  const tradingDate = date || getLatestTradingDate();

  const row = db
    .prepare(
      `
      SELECT *
      FROM l1_contracts
      WHERE trading_date = ?
    `
    )
    .get(tradingDate) as L1ContractRow | undefined;

  if (!row) return null;

  // Parse hard_blocks JSON array
  let hardBlocks: string[] = [];
  if (row.hard_blocks) {
    try {
      hardBlocks = JSON.parse(row.hard_blocks);
    } catch {
      hardBlocks = [];
    }
  }

  return {
    contractId: row.contract_id,
    tradingDate: row.trading_date,
    generatedAt: row.generated_at,
    validUntil: row.valid_until,
    model: row.model,
    regime: row.regime.toUpperCase() as L1Contract["regime"],
    regimeTransition: row.regime_transition?.toUpperCase() as L1Contract["regimeTransition"],
    confidence: row.confidence.toUpperCase() as L1Contract["confidence"],
    confidenceScore: row.confidence_score ?? 0,
    vixBucket: row.vix_bucket,
    vixValue: row.vix_value ?? 0,
    positionPct: row.final_position_pct,
    positionBias: row.position_bias,
    hardBlocks,
    yieldSpreadBps: row.yield_spread_bps,
    yieldShape: row.yield_shape,
    breadthPct: row.breadth_pct ?? 0,
    fomcDaysAway: row.fomc_days_away,
    sahmTriggered: row.sahm_triggered === 1,
    reportPath: row.report_path,
  };
}

interface IndexOHLCVRow {
  index_code: string;
  index_name: string;
  date: string;
  close: number;
}

/**
 * Get all indices with today's and previous day's close for change calculation
 */
export function getIndices(date?: string): IndexData[] {
  const tradingDate = date || getLatestTradingDate();

  // Get today and yesterday's data for each index
  const rows = db
    .prepare(
      `
      WITH ranked AS (
        SELECT
          index_code,
          index_name,
          date,
          close,
          ROW_NUMBER() OVER (PARTITION BY index_code ORDER BY date DESC) as rn
        FROM indices_ohlcv
        WHERE date <= ?
      )
      SELECT index_code, index_name, date, close
      FROM ranked
      WHERE rn <= 2
      ORDER BY index_code, date DESC
    `
    )
    .all(tradingDate) as IndexOHLCVRow[];

  // Group by index and calculate changes
  const indexMap = new Map<string, { today: IndexOHLCVRow; prev?: IndexOHLCVRow }>();

  for (const row of rows) {
    const existing = indexMap.get(row.index_code);
    if (!existing) {
      indexMap.set(row.index_code, { today: row });
    } else {
      existing.prev = row;
    }
  }

  // Display name mapping
  const displayNames: Record<string, string> = {
    "^GSPC": "S&P 500",
    "^DJI": "Dow Jones",
    "^IXIC": "NASDAQ",
    "^NDX": "NASDAQ 100",
  };

  // Order of indices to display
  const indexOrder = ["^GSPC", "^IXIC", "^DJI", "^NDX"];

  return indexOrder
    .filter((code) => indexMap.has(code))
    .map((code) => {
      const data = indexMap.get(code)!;
      const prevClose = data.prev?.close ?? data.today.close;
      const change = data.today.close - prevClose;
      const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

      return {
        code,
        name: displayNames[code] || data.today.index_name,
        close: data.today.close,
        prevClose,
        change,
        changePct,
      };
    });
}

interface SentimentRow {
  put_call_ratio: number | null;
  put_volume: number | null;
  call_volume: number | null;
  breadth_pct: number | null;
  breadth_above_50ma: number | null;
  breadth_total: number | null;
  nyse_ad_ratio: number | null;
  nyse_advancing: number | null;
  nyse_declining: number | null;
  sentiment_regime: string | null;
}

/**
 * Get market sentiment data
 */
export function getMarketSentiment(date?: string): MarketSentiment | null {
  const tradingDate = date || getLatestTradingDate();

  const row = db
    .prepare(
      `
      SELECT *
      FROM market_sentiment
      WHERE date = ?
    `
    )
    .get(tradingDate) as SentimentRow | undefined;

  if (!row) return null;

  return {
    putCallRatio: row.put_call_ratio ?? 0,
    putVolume: row.put_volume ?? 0,
    callVolume: row.call_volume ?? 0,
    breadthPct: row.breadth_pct ?? 0,
    breadthAbove: row.breadth_above_50ma ?? 0,
    breadthTotal: row.breadth_total ?? 0,
    nyseAdRatio: row.nyse_ad_ratio ?? 0,
    nyseAdvancing: row.nyse_advancing ?? 0,
    nyseDeclining: row.nyse_declining ?? 0,
    sentimentRegime: row.sentiment_regime ?? "neutral",
  };
}

interface YieldRow {
  treasury_3m_close: number | null;
  treasury_5y_close: number | null;
  treasury_10y_close: number | null;
}

/**
 * Get treasury yields
 */
export function getTreasuryYields(date?: string): TreasuryYields | null {
  const tradingDate = date || getLatestTradingDate();

  const row = db
    .prepare(
      `
      SELECT treasury_3m_close, treasury_5y_close, treasury_10y_close
      FROM treasury_yields
      WHERE date = ?
    `
    )
    .get(tradingDate) as YieldRow | undefined;

  if (!row) return null;

  const t3m = row.treasury_3m_close ?? 0;
  const t5y = row.treasury_5y_close ?? 0;
  const t10y = row.treasury_10y_close ?? 0;

  return {
    treasury3m: t3m,
    treasury5y: t5y,
    treasury10y: t10y,
    spread5y10y: (t10y - t5y) * 100, // Convert to bps
    spread3m10y: (t10y - t3m) * 100,
  };
}

/**
 * Get complete market overview for the Market page
 */
export function getMarketOverview(date?: string): MarketOverview | null {
  const tradingDate = date || getLatestTradingDate();

  const l1 = getL1Contract(tradingDate);
  if (!l1) return null;

  const indices = getIndices(tradingDate);
  const sentiment = getMarketSentiment(tradingDate);
  const yields = getTreasuryYields(tradingDate);

  return {
    tradingDate: l1.tradingDate,
    generatedAt: l1.generatedAt,

    regime: l1.regime,
    regimeTransition: l1.regimeTransition,
    confidence: l1.confidence,
    confidenceScore: l1.confidenceScore,
    positionPct: l1.positionPct,
    positionBias: l1.positionBias,

    vix: {
      value: l1.vixValue,
      bucket: l1.vixBucket,
    },

    breadth: {
      pct: sentiment?.breadthPct ?? l1.breadthPct,
      above: sentiment?.breadthAbove ?? 0,
      total: sentiment?.breadthTotal ?? 0,
    },

    hardBlocks: l1.hardBlocks,
    fomcDaysAway: l1.fomcDaysAway,
    sahmTriggered: l1.sahmTriggered,

    indices,

    sentiment: {
      putCallRatio: sentiment?.putCallRatio ?? 0,
      nyseAdRatio: sentiment?.nyseAdRatio ?? 0,
    },

    yields,

    reportPath: l1.reportPath,
  };
}

interface IndexHistoryRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Get historical index data for chart
 */
export function getIndexHistory(
  indexCode: string = "^GSPC",
  days: number = 20,
  endDate?: string
): IndexHistoryRow[] {
  const date = endDate || getLatestTradingDate();

  const rows = db
    .prepare(
      `
      SELECT date, open, high, low, close, volume
      FROM indices_ohlcv
      WHERE index_code = ? AND date <= ?
      ORDER BY date DESC
      LIMIT ?
    `
    )
    .all(indexCode, date, days) as IndexHistoryRow[];

  return rows.reverse(); // Chronological order
}

// ============================================================================
// Regime History
// ============================================================================

export interface RegimeHistoryItem {
  date: string;
  regime: L1Contract["regime"];
}

interface RegimeHistoryRow {
  trading_date: string;
  regime: string;
}

/**
 * Get regime history for the past N days
 */
export function getRegimeHistory(
  days: number = 20,
  endDate?: string
): RegimeHistoryItem[] {
  const date = endDate || getLatestTradingDate();

  const rows = db
    .prepare(
      `
      SELECT trading_date, regime
      FROM l1_contracts
      WHERE trading_date <= ?
      ORDER BY trading_date DESC
      LIMIT ?
    `
    )
    .all(date, days) as RegimeHistoryRow[];

  return rows.reverse().map((row) => ({
    date: row.trading_date,
    regime: row.regime.toUpperCase() as L1Contract["regime"],
  }));
}

// ============================================================================
// Indices with Sparkline Data
// ============================================================================

export interface IndexWithSparkline {
  code: string;
  name: string;
  close: number;
  prevClose: number;
  change: number;
  changePct: number;
  sparkline: number[]; // 7-day close prices
  weekChange: number; // 5-day change percentage
}

/**
 * Get all indices with sparkline data (7 days)
 */
export function getIndicesWithSparklines(date?: string): IndexWithSparkline[] {
  const tradingDate = date || getLatestTradingDate();

  // Display name mapping
  const displayNames: Record<string, string> = {
    "^GSPC": "S&P 500",
    "^DJI": "Dow Jones",
    "^IXIC": "NASDAQ",
    "^NDX": "NASDAQ 100",
  };

  const indexOrder = ["^GSPC", "^IXIC", "^DJI", "^NDX"];

  const results: IndexWithSparkline[] = [];

  for (const code of indexOrder) {
    const rows = db
      .prepare(
        `
        SELECT date, close
        FROM indices_ohlcv
        WHERE index_code = ? AND date <= ?
        ORDER BY date DESC
        LIMIT 7
      `
      )
      .all(code, tradingDate) as { date: string; close: number }[];

    if (rows.length === 0) continue;

    const sparkline = rows.map((r) => r.close).reverse();
    const today = rows[0].close;
    const yesterday = rows[1]?.close ?? today;
    const weekAgo = rows[rows.length - 1]?.close ?? today;

    const change = today - yesterday;
    const changePct = yesterday !== 0 ? (change / yesterday) * 100 : 0;
    const weekChange = weekAgo !== 0 ? ((today - weekAgo) / weekAgo) * 100 : 0;

    results.push({
      code,
      name: displayNames[code] || code,
      close: today,
      prevClose: yesterday,
      change,
      changePct,
      sparkline,
      weekChange,
    });
  }

  return results;
}

// ============================================================================
// Indices OHLCV History for Charts
// ============================================================================

export interface IndexOHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicesOHLCVHistory {
  code: string;
  name: string;
  data: IndexOHLCV[];
}

/**
 * Get OHLCV history for all 4 indices (for quad chart view)
 */
export function getIndicesOHLCVHistory(
  days: number = 20,
  endDate?: string
): IndicesOHLCVHistory[] {
  const date = endDate || getLatestTradingDate();

  const displayNames: Record<string, string> = {
    "^GSPC": "S&P 500",
    "^DJI": "Dow Jones",
    "^IXIC": "NASDAQ",
    "^NDX": "NASDAQ 100",
  };

  const indexOrder = ["^GSPC", "^IXIC", "^DJI", "^NDX"];
  const results: IndicesOHLCVHistory[] = [];

  for (const code of indexOrder) {
    const rows = db
      .prepare(
        `
        SELECT date, open, high, low, close, volume
        FROM indices_ohlcv
        WHERE index_code = ? AND date <= ?
        ORDER BY date DESC
        LIMIT ?
      `
      )
      .all(code, date, days) as IndexOHLCV[];

    if (rows.length > 0) {
      results.push({
        code,
        name: displayNames[code] || code,
        data: rows.reverse(), // Chronological order
      });
    }
  }

  return results;
}
