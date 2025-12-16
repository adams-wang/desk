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
  // Gap indicators (from gap_signal + gap_interpretation)
  gap_type: string | null;  // up_large, up_small, down_large, down_small
  gap_pct: number | null;  // gap percentage from database
  gap_filled: string | null;  // Y, N
  gap_conclusion: string | null;  // PREFER, AVOID
  gap_interpretation: string | null;
  // MRS indicators
  mrs_20: number | null;
  mrs_20_ts: number | null;
  // OFD (from candle_descriptors + ofd_interpretation)
  ofd_code: string | null;
  ofd_conclusion: string | null;
  ofd_interpretation: string | null;
  // Pattern (from candle_pattern + pattern_interpretation)
  pattern: string | null;
  pattern_conclusion: string | null;  // PREFER or AVOID
  pattern_interpretation: string | null;
  body_size_pct: number | null;
  candle_volume_ratio: number | null;  // volume_ratio from candle_descriptors
  upper_wick_ratio: number | null;
  lower_wick_ratio: number | null;
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

export interface AnalystAction {
  action_date: string;
  firm: string;
  action: string;
  from_grade: string | null;
  to_grade: string | null;
}

export interface AnalystActionsSummary {
  upgrades: number;
  downgrades: number;
  maintains: number;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  cluster: boolean;
  recent: AnalystAction[];
}

export interface AnalystTarget {
  action_date: string;
  firm: string;
  target_price: number;
  prior_target: number | null;
  target_change_pct: number | null;
  action_type: string | null;
}

export interface L3Contract {
  ticker: string;
  trading_date: string;
  verdict: string;
  thesis: string;
  conviction: string;
  conviction_score: number;
  entry_price: number;
  stop_loss: number;
  stop_loss_pct: number;
  target_price: number;
  risk_reward: number;
  shares: number;
  position_value: number;
  risk_dollars: number;
  l1_position_modifier: number;
  l2_sector_modifier: number;
  combined_modifier: number;
  final_position_pct: number;
}

export interface AnalystTargetsSummary {
  raises: number;
  lowers: number;
  avg_raise_pct: number;
  avg_lower_pct: number;
  big_raises: number;
  signal: "VERY_BULLISH" | "BULLISH" | "BEARISH" | "VERY_BEARISH" | "NEUTRAL";
  recent: AnalystTarget[];
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
  // Gap indicators (from gap_signal + gap_interpretation)
  gap_type: string | null;  // up_large, up_small, down_large, down_small
  gap_conclusion: string | null;  // PREFER, AVOID
  // Technicals
  atr_14: number | null;
  rsi_14: number | null;
  macd: number | null;
  macd_signal: number | null;
  // Risk Metrics
  beta_60: number | null;
  volatility_20: number | null;
  sharpe_ratio_20: number | null;
  alpha_20d: number | null;
  // OFD (from candle_descriptors + ofd_interpretation)
  ofd_code: string | null;
  ofd_conclusion: string | null;
  // Pattern (from candle_pattern + pattern_interpretation INNER JOIN)
  pattern: string | null;
  pattern_conclusion: string | null;  // PREFER or AVOID
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
 * Get detailed stock data for a single ticker on a specific trading date
 */
export function getStockDetail(ticker: string, endDate?: string): StockDetail | null {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
  const startTime = Date.now();

  const row = db
    .prepare(
      `
    SELECT
      o.ticker, o.date, o.open, o.high, o.low, o.close, o.volume,
      i.mrs_5, i.mrs_10, i.mrs_20, i.mrs_20_cs,
      -- Gap (from gap_signal + gap_interpretation)
      gs.gap_type, gi.conclusion as gap_conclusion,
      t.atr_14, t.rsi_14, t.macd_line as macd, t.macd_signal,
      i.beta_60, i.volatility_20, i.sharpe_ratio_20, i.alpha_20d,
      c.ofd_code,
      oi.conclusion as ofd_conclusion,
      CASE WHEN pi.conclusion IS NOT NULL THEN cp.pattern ELSE NULL END as pattern,
      pi.conclusion as pattern_conclusion,
      l10.verdict as verdict_10, l10.conviction as conviction_10,
      l20.verdict as verdict_20, l20.conviction as conviction_20,
      m.name as company_name, m.sector, m.industry
    FROM stocks_ohlcv o
    LEFT JOIN stocks_indicators i ON o.ticker = i.ticker AND o.date = i.date
    LEFT JOIN stocks_technicals t ON o.ticker = t.ticker AND o.date = t.date
    LEFT JOIN candle_descriptors c ON o.ticker = c.ticker AND o.date = c.date
    LEFT JOIN ofd_interpretation oi ON c.ofd_code = oi.ofd_code
    LEFT JOIN (
      SELECT ticker, date, type, pattern, regime_mrs20, volume_code,
             ROW_NUMBER() OVER (PARTITION BY ticker, date ORDER BY CASE type WHEN '3-bar' THEN 0 ELSE 1 END) as rn
      FROM candle_pattern
    ) cp ON o.ticker = cp.ticker AND o.date = cp.date AND cp.rn = 1
    LEFT JOIN pattern_interpretation pi ON cp.pattern = pi.pattern
                                       AND cp.regime_mrs20 = pi.regime_mrs20
                                       AND cp.volume_code = pi.volume_code
    LEFT JOIN l3_contracts_10 l10 ON o.ticker = l10.ticker AND o.date = l10.trading_date
    LEFT JOIN l3_contracts_20 l20 ON o.ticker = l20.ticker AND o.date = l20.trading_date
    LEFT JOIN stocks_metadata m ON o.ticker = m.ticker
    LEFT JOIN gap_signal gs ON o.ticker = gs.ticker AND o.date = gs.date
    LEFT JOIN gap_interpretation gi ON gs.gap_type = gi.gap_type
                                   AND gs.filled = gi.filled
                                   AND gs.volume_code = gi.volume_code
                                   AND gs.regime = gi.regime
                                   AND gi.regime_mrs10 = CASE
                                       WHEN gs.regime IN ('crisis', 'risk_off') THEN ''
                                       ELSE COALESCE(gs.regime_mrs10, '')
                                   END
                                   AND gi.regime_mrs20 = CASE
                                       WHEN gs.regime IN ('crisis', 'risk_off') THEN ''
                                       ELSE COALESCE(gs.regime_mrs20, '')
                                   END
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
export function getStockOHLCV(ticker: string, days: number = 252, endDate?: string): StockOHLCV[] {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
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
      i.mrs_5, i.mrs_10, i.mrs_20, i.mrs_20_cs,
      gs.gap_type, gi.conclusion as gap_conclusion,
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
    LEFT JOIN gap_signal gs ON o.ticker = gs.ticker AND o.date = gs.date
    LEFT JOIN gap_interpretation gi ON gs.gap_type = gi.gap_type
                                   AND gs.filled = gi.filled
                                   AND gs.volume_code = gi.volume_code
                                   AND gs.regime = gi.regime
                                   AND gi.regime_mrs10 = CASE
                                       WHEN gs.regime IN ('crisis', 'risk_off') THEN ''
                                       ELSE COALESCE(gs.regime_mrs10, '')
                                   END
                                   AND gi.regime_mrs20 = CASE
                                       WHEN gs.regime IN ('crisis', 'risk_off') THEN ''
                                       ELSE COALESCE(gs.regime_mrs20, '')
                                   END
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
export function getStockOHLCVExtended(ticker: string, days: number = 20, endDate?: string): StockOHLCVExtended[] {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
  const startTime = Date.now();

  const rows = db
    .prepare(
      `
    SELECT
      o.date, o.open, o.high, o.low, o.close, o.volume,
      -- Volume indicators
      i.volume_10ma, i.volume_10_ts,
      -- Gap indicators (from gap_signal + gap_interpretation)
      gs.gap_type, gs.gap_pct, gs.filled as gap_filled,
      gi.conclusion as gap_conclusion, gi.interpretation as gap_interpretation,
      -- MRS indicators
      i.mrs_20, i.mrs_20_ts,
      -- OFD (from candle_descriptors + ofd_interpretation)
      c.ofd_code,
      oi.conclusion as ofd_conclusion,
      oi.interpretation as ofd_interpretation,
      -- Pattern (from candle_pattern + pattern_interpretation) - only retrieve pattern if interpretation exists
      CASE WHEN pi.conclusion IS NOT NULL THEN cp.pattern ELSE NULL END as pattern,
      pi.conclusion as pattern_conclusion,
      pi.interpretation as pattern_interpretation,
      c.body_size_pct, c.volume_ratio as candle_volume_ratio,
      c.upper_wick_ratio, c.lower_wick_ratio,
      -- L3 verdicts
      l10.verdict as verdict_10, l20.verdict as verdict_20,
      -- SMAs from technicals
      t.sma_20, t.sma_50, t.sma_200
    FROM stocks_ohlcv o
    LEFT JOIN stocks_indicators i ON o.ticker = i.ticker AND o.date = i.date
    LEFT JOIN candle_descriptors c ON o.ticker = c.ticker AND o.date = c.date
    LEFT JOIN ofd_interpretation oi ON c.ofd_code = oi.ofd_code
    LEFT JOIN (
      SELECT ticker, date, type, pattern, regime_mrs20, volume_code,
             ROW_NUMBER() OVER (PARTITION BY ticker, date ORDER BY CASE type WHEN '3-bar' THEN 0 ELSE 1 END) as rn
      FROM candle_pattern
    ) cp ON o.ticker = cp.ticker AND o.date = cp.date AND cp.rn = 1
    LEFT JOIN pattern_interpretation pi ON cp.pattern = pi.pattern
                                       AND cp.regime_mrs20 = pi.regime_mrs20
                                       AND cp.volume_code = pi.volume_code
    LEFT JOIN l3_contracts_10 l10 ON o.ticker = l10.ticker AND o.date = l10.trading_date
    LEFT JOIN l3_contracts_20 l20 ON o.ticker = l20.ticker AND o.date = l20.trading_date
    LEFT JOIN stocks_technicals t ON o.ticker = t.ticker AND o.date = t.date
    LEFT JOIN gap_signal gs ON o.ticker = gs.ticker AND o.date = gs.date
    LEFT JOIN gap_interpretation gi ON gs.gap_type = gi.gap_type
                                   AND gs.filled = gi.filled
                                   AND gs.volume_code = gi.volume_code
                                   AND gs.regime = gi.regime
                                   AND gi.regime_mrs10 = CASE
                                       WHEN gs.regime IN ('crisis', 'risk_off') THEN ''
                                       ELSE COALESCE(gs.regime_mrs10, '')
                                   END
                                   AND gi.regime_mrs20 = CASE
                                       WHEN gs.regime IN ('crisis', 'risk_off') THEN ''
                                       ELSE COALESCE(gs.regime_mrs20, '')
                                   END
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
export function getMRSHistory(ticker: string, days: number = 20, endDate?: string): MRSHistory[] {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
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

/**
 * Get analyst actions (upgrades/downgrades) for a ticker
 * Lookback: 30 days, returns top 10 recent
 */
export function getAnalystActions(ticker: string, endDate?: string, days: number = 30): AnalystActionsSummary | null {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
  const startTime = Date.now();

  // Calculate cutoff date
  const endDateObj = new Date(date);
  const cutoffDate = new Date(endDateObj);
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString().split('T')[0];

  const rows = db
    .prepare(
      `
    SELECT action_date, firm, action, from_grade, to_grade
    FROM yfinance_analyst_actions
    WHERE ticker = ?
      AND action_date >= ?
      AND action_date <= ?
    ORDER BY action_date DESC
  `
    )
    .all(ticker.toUpperCase(), cutoff, date) as AnalystAction[];

  log.debug(
    { ticker, days, rowCount: rows.length, latencyMs: Date.now() - startTime },
    "Analyst actions query"
  );

  if (rows.length === 0) {
    return null;
  }

  // Calculate summary
  const upgrades = rows.filter(a => a.action === 'up').length;
  const downgrades = rows.filter(a => a.action === 'down').length;
  const initiations = rows.filter(a => a.action === 'init').length;
  const maintains = rows.filter(a => a.action === 'main' || a.action === 'reit').length;

  const net = upgrades + initiations - downgrades;
  let trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  if (net >= 3) {
    trend = "BULLISH";
  } else if (net <= -3) {
    trend = "BEARISH";
  } else {
    trend = "NEUTRAL";
  }

  // Cluster detection: 5+ actions in last 7 days
  const cluster7dCutoff = new Date(endDateObj);
  cluster7dCutoff.setDate(cluster7dCutoff.getDate() - 7);
  const cluster7dStr = cluster7dCutoff.toISOString().split('T')[0];
  const recent7d = rows.filter(a => a.action_date >= cluster7dStr);
  const cluster = recent7d.length >= 5;

  return {
    upgrades,
    downgrades,
    maintains,
    trend,
    cluster,
    recent: rows.slice(0, 10),
  };
}

/**
 * Get analyst price target changes for a ticker
 * Lookback: 30 days, returns top 10 recent
 */
export function getAnalystTargets(ticker: string, endDate?: string, days: number = 30): AnalystTargetsSummary | null {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
  const startTime = Date.now();

  // Calculate cutoff date
  const endDateObj = new Date(date);
  const cutoffDate = new Date(endDateObj);
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString().split('T')[0];

  const rows = db
    .prepare(
      `
    SELECT action_date, firm, target_price, prior_target, target_change_pct, action_type
    FROM yfinance_analyst_targets
    WHERE ticker = ?
      AND action_date >= ?
      AND action_date <= ?
      AND target_price > 0
    ORDER BY action_date DESC
  `
    )
    .all(ticker.toUpperCase(), cutoff, date) as AnalystTarget[];

  log.debug(
    { ticker, days, rowCount: rows.length, latencyMs: Date.now() - startTime },
    "Analyst targets query"
  );

  if (rows.length === 0) {
    return null;
  }

  // Calculate summary
  const raises = rows.filter(t => t.target_change_pct && t.target_change_pct > 0);
  const lowers = rows.filter(t => t.target_change_pct && t.target_change_pct < 0);

  const avgRaise = raises.length > 0
    ? raises.reduce((sum, t) => sum + (t.target_change_pct || 0), 0) / raises.length
    : 0;
  const avgLower = lowers.length > 0
    ? lowers.reduce((sum, t) => sum + (t.target_change_pct || 0), 0) / lowers.length
    : 0;

  const bigRaises = raises.filter(t => (t.target_change_pct || 0) > 20).length;

  // Signal logic
  let signal: "VERY_BULLISH" | "BULLISH" | "BEARISH" | "VERY_BEARISH" | "NEUTRAL";
  if (avgRaise > 15 && raises.length > lowers.length * 2) {
    signal = "VERY_BULLISH";
  } else if (avgRaise > 10 && raises.length > lowers.length) {
    signal = "BULLISH";
  } else if (avgLower < -15 && lowers.length > raises.length * 2) {
    signal = "VERY_BEARISH";
  } else if (avgLower < -10 && lowers.length > raises.length) {
    signal = "BEARISH";
  } else {
    signal = "NEUTRAL";
  }

  return {
    raises: raises.length,
    lowers: lowers.length,
    avg_raise_pct: avgRaise,
    avg_lower_pct: avgLower,
    big_raises: bigRaises,
    signal,
    recent: rows.slice(0, 10),
  };
}

/**
 * Get L3 contract for a ticker (both 10-day and 20-day variants)
 */
export function getL3Contracts(ticker: string, endDate?: string): { l3_10: L3Contract | null; l3_20: L3Contract | null } {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
  const startTime = Date.now();

  const query = `
    SELECT
      ticker, trading_date, verdict, thesis, conviction, conviction_score,
      entry_price, stop_loss, stop_loss_pct, target_price, risk_reward,
      shares, position_value, risk_dollars,
      l1_position_modifier, l2_sector_modifier, combined_modifier, final_position_pct
    FROM %TABLE%
    WHERE ticker = ? AND trading_date = ?
  `;

  const l3_10 = db
    .prepare(query.replace('%TABLE%', 'l3_contracts_10'))
    .get(ticker.toUpperCase(), date) as L3Contract | undefined;

  const l3_20 = db
    .prepare(query.replace('%TABLE%', 'l3_contracts_20'))
    .get(ticker.toUpperCase(), date) as L3Contract | undefined;

  log.debug(
    { ticker, date, has_10: !!l3_10, has_20: !!l3_20, latencyMs: Date.now() - startTime },
    "L3 contracts query"
  );

  return {
    l3_10: l3_10 || null,
    l3_20: l3_20 || null,
  };
}
