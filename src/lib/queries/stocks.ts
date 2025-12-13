import db from "../db";
import { getLatestTradingDate } from "./trading-days";
import { getLogger } from "../logger";

export interface StockOHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockOHLCVExtended extends StockOHLCV {
  // Volume indicators
  volume_10ma: number | null;
  volume_10_ts: number | null;
  // Gap indicators
  gap_pct: number | null;
  gap_type: string | null;
  gap_filled: number | null;  // 0 or 1
  gap_volume_ratio: number | null;
  gap_percentile: number | null;
  // MRS indicators
  mrs_20: number | null;
  mrs_20_ts: number | null;
  // Candle descriptors
  ofd_code: string | null;
  conclusion: string | null;
  pattern: string | null;
  body_size_pct: number | null;
  candle_volume_ratio: number | null;  // volume_ratio from candle_descriptors
  upper_wick_ratio: number | null;
  lower_wick_ratio: number | null;
  reversal_confirmed: string | null;
  // L3 verdicts
  verdict_10: string | null;
  verdict_20: string | null;
  // SMAs from technicals
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
}

export interface MRSHistory {
  date: string;
  mrs_5: number | null;
  mrs_10: number | null;
  mrs_20: number | null;
}

export interface StockDetail {
  ticker: string;
  date: string;
  // OHLCV
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Indicators
  mrs_5: number | null;
  mrs_10: number | null;
  mrs_20: number | null;
  mrs_20_cs: number | null;
  gap_pct: number | null;
  gap_type: string | null;
  // Technicals
  atr_14: number | null;
  rsi_14: number | null;
  macd: number | null;
  macd_signal: number | null;
  // Candle descriptors
  ofd_code: string | null;
  conclusion: string | null;
  pattern: string | null;
  // L3 verdicts
  verdict_10: string | null;
  conviction_10: string | null;
  verdict_20: string | null;
  conviction_20: string | null;
  // Metadata
  company_name: string | null;
  sector: string | null;
  industry: string | null;
}

/**
 * Get detailed stock data for a single ticker on the latest trading date
 */
export function getStockDetail(ticker: string): StockDetail | null {
  const log = getLogger();
  const date = getLatestTradingDate();
  const startTime = Date.now();

  const row = db
    .prepare(
      `
    SELECT
      o.ticker, o.date, o.open, o.high, o.low, o.close, o.volume,
      i.mrs_5, i.mrs_10, i.mrs_20, i.mrs_20_cs, i.gap_pct, i.gap_type,
      t.atr_14, t.rsi_14, t.macd_line as macd, t.macd_signal,
      c.ofd_code, c.conclusion, c.pattern,
      l10.verdict as verdict_10, l10.conviction as conviction_10,
      l20.verdict as verdict_20, l20.conviction as conviction_20,
      m.name as company_name, m.sector, m.industry
    FROM stocks_ohlcv o
    LEFT JOIN stocks_indicators i ON o.ticker = i.ticker AND o.date = i.date
    LEFT JOIN stocks_technicals t ON o.ticker = t.ticker AND o.date = t.date
    LEFT JOIN candle_descriptors c ON o.ticker = c.ticker AND o.date = c.date
    LEFT JOIN l3_contracts_10 l10 ON o.ticker = l10.ticker AND o.date = l10.trading_date
    LEFT JOIN l3_contracts_20 l20 ON o.ticker = l20.ticker AND o.date = l20.trading_date
    LEFT JOIN stocks_metadata m ON o.ticker = m.ticker
    WHERE o.ticker = ? AND o.date = ?
  `
    )
    .get(ticker.toUpperCase(), date) as StockDetail | undefined;

  log.debug(
    { ticker, date, found: !!row, latencyMs: Date.now() - startTime },
    "Stock detail query"
  );

  return row || null;
}

/**
 * Get OHLCV history for a ticker (most recent first)
 */
export function getStockOHLCV(ticker: string, days: number = 252): StockOHLCV[] {
  const log = getLogger();
  const date = getLatestTradingDate();
  const startTime = Date.now();

  const rows = db
    .prepare(
      `
    SELECT date, open, high, low, close, volume
    FROM stocks_ohlcv
    WHERE ticker = ? AND date <= ?
    ORDER BY date DESC
    LIMIT ?
  `
    )
    .all(ticker.toUpperCase(), date, days) as StockOHLCV[];

  log.debug(
    { ticker, days, rowCount: rows.length, latencyMs: Date.now() - startTime },
    "Stock OHLCV query"
  );

  // Return in chronological order (oldest first) for charts
  return rows.reverse();
}

/**
 * Get list of all stocks with latest data for screener
 */
export function getStockList(limit: number = 500): StockDetail[] {
  const log = getLogger();
  const date = getLatestTradingDate();
  const startTime = Date.now();

  const rows = db
    .prepare(
      `
    SELECT
      o.ticker, o.date, o.open, o.high, o.low, o.close, o.volume,
      i.mrs_5, i.mrs_10, i.mrs_20, i.mrs_20_cs, i.gap_pct, i.gap_type,
      t.atr_14, t.rsi_14,
      l10.verdict as verdict_10, l10.conviction as conviction_10,
      l20.verdict as verdict_20, l20.conviction as conviction_20,
      m.name as company_name, m.sector, m.industry
    FROM stocks_ohlcv o
    LEFT JOIN stocks_indicators i ON o.ticker = i.ticker AND o.date = i.date
    LEFT JOIN stocks_technicals t ON o.ticker = t.ticker AND o.date = t.date
    LEFT JOIN l3_contracts_10 l10 ON o.ticker = l10.ticker AND o.date = l10.trading_date
    LEFT JOIN l3_contracts_20 l20 ON o.ticker = l20.ticker AND o.date = l20.trading_date
    LEFT JOIN stocks_metadata m ON o.ticker = m.ticker
    WHERE o.date = ?
    ORDER BY o.volume DESC
    LIMIT ?
  `
    )
    .all(date, limit) as StockDetail[];

  log.debug(
    { date, limit, rowCount: rows.length, latencyMs: Date.now() - startTime },
    "Stock list query"
  );

  return rows;
}

/**
 * Search stocks by ticker prefix
 */
export function searchStocks(query: string, limit: number = 20): { ticker: string; company_name: string | null }[] {
  const log = getLogger();
  const startTime = Date.now();

  const rows = db
    .prepare(
      `
    SELECT ticker, name as company_name
    FROM stocks_metadata
    WHERE ticker LIKE ? OR name LIKE ?
    ORDER BY ticker
    LIMIT ?
  `
    )
    .all(`${query.toUpperCase()}%`, `%${query}%`, limit) as { ticker: string; company_name: string | null }[];

  log.debug(
    { query, rowCount: rows.length, latencyMs: Date.now() - startTime },
    "Stock search query"
  );

  return rows;
}

/**
 * Get extended OHLCV with indicators for P1 chart (price + volume with patterns)
 * Matches Python stock_summary.py query exactly
 */
export function getStockOHLCVExtended(ticker: string, days: number = 20): StockOHLCVExtended[] {
  const log = getLogger();
  const date = getLatestTradingDate();
  const startTime = Date.now();

  const rows = db
    .prepare(
      `
    SELECT
      o.date, o.open, o.high, o.low, o.close, o.volume,
      -- Volume indicators
      i.volume_10ma, i.volume_10_ts,
      -- Gap indicators
      i.gap_pct, i.gap_type, i.gap_filled, i.gap_volume_ratio, i.gap_percentile,
      -- MRS indicators
      i.mrs_20, i.mrs_20_ts,
      -- Candle descriptors
      c.ofd_code, c.conclusion, c.pattern,
      c.body_size_pct, c.volume_ratio as candle_volume_ratio,
      c.upper_wick_ratio, c.lower_wick_ratio, c.reversal_confirmed,
      -- L3 verdicts
      l10.verdict as verdict_10, l20.verdict as verdict_20,
      -- SMAs from technicals
      t.sma_20, t.sma_50, t.sma_200
    FROM stocks_ohlcv o
    LEFT JOIN stocks_indicators i ON o.ticker = i.ticker AND o.date = i.date
    LEFT JOIN candle_descriptors c ON o.ticker = c.ticker AND o.date = c.date
    LEFT JOIN l3_contracts_10 l10 ON o.ticker = l10.ticker AND o.date = l10.trading_date
    LEFT JOIN l3_contracts_20 l20 ON o.ticker = l20.ticker AND o.date = l20.trading_date
    LEFT JOIN stocks_technicals t ON o.ticker = t.ticker AND o.date = t.date
    WHERE o.ticker = ? AND o.date <= ?
    ORDER BY o.date DESC
    LIMIT ?
  `
    )
    .all(ticker.toUpperCase(), date, days) as StockOHLCVExtended[];

  log.debug(
    { ticker, days, rowCount: rows.length, latencyMs: Date.now() - startTime },
    "Stock OHLCV extended query"
  );

  // Return in chronological order (oldest first) for charts
  return rows.reverse();
}

/**
 * Get MRS history for P3 chart (MRS trajectory)
 */
export function getMRSHistory(ticker: string, days: number = 20): MRSHistory[] {
  const log = getLogger();
  const date = getLatestTradingDate();
  const startTime = Date.now();

  const rows = db
    .prepare(
      `
    SELECT date, mrs_5, mrs_10, mrs_20
    FROM stocks_indicators
    WHERE ticker = ? AND date <= ?
    ORDER BY date DESC
    LIMIT ?
  `
    )
    .all(ticker.toUpperCase(), date, days) as MRSHistory[];

  log.debug(
    { ticker, days, rowCount: rows.length, latencyMs: Date.now() - startTime },
    "MRS history query"
  );

  // Return in chronological order (oldest first) for charts
  return rows.reverse();
}
