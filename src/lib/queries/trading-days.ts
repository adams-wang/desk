import db from "../db";

interface TradingDayRow {
  date: string;
}

/**
 * Get the latest trading date from the trading_days table.
 * ALWAYS use this instead of MAX(date) on other tables.
 */
export function getLatestTradingDate(): string {
  const row = db
    .prepare("SELECT date FROM trading_days WHERE day_rank = 1")
    .get() as TradingDayRow;
  return row.date;
}

/**
 * Get a trading date by its rank (1 = latest, 2 = previous, etc.)
 */
export function getTradingDateByRank(rank: number): string {
  const row = db
    .prepare("SELECT date FROM trading_days WHERE day_rank = ?")
    .get(rank) as TradingDayRow;
  return row.date;
}

/**
 * Get the last N trading dates
 */
export function getLastNTradingDates(n: number): string[] {
  const rows = db
    .prepare("SELECT date FROM trading_days WHERE day_rank <= ? ORDER BY day_rank ASC")
    .all(n) as TradingDayRow[];
  return rows.map((r) => r.date);
}

export interface MarketRegime {
  date: string;
  vix_close: number;
  regime: "risk_on" | "normal" | "risk_off" | "crisis";
}

/**
 * Get market regime data for a specific date
 */
export function getMarketRegime(date: string): MarketRegime | null {
  const row = db
    .prepare("SELECT date, vix_close, regime FROM market_regime WHERE date = ?")
    .get(date) as MarketRegime | undefined;
  return row || null;
}

/**
 * Get VIX history for chart display
 * Fetches extra days to account for potential date mismatches between VIX and stock data
 * (e.g., VIX may have data for days when specific stocks don't trade)
 */
export function getVIXHistory(days: number = 20, endDate?: string): MarketRegime[] {
  const date = endDate || getLatestTradingDate();
  const rows = db
    .prepare(`
      SELECT date, vix_close, regime
      FROM market_regime
      WHERE date <= ?
      ORDER BY date DESC
      LIMIT ?
    `)
    .all(date, days + 5) as MarketRegime[]; // Fetch extra days for date alignment
  return rows.reverse(); // Chronological order
}

/**
 * Get all available trading dates for calendar selection
 */
export function getAllTradingDates(): string[] {
  const rows = db
    .prepare("SELECT date FROM trading_days ORDER BY date DESC")
    .all() as { date: string }[];
  return rows.map((r) => r.date);
}

export interface NASDAQData {
  date: string;
  close: number;
  pct_change: number; // Cumulative % change from first day
}

/**
 * Get NASDAQ (^IXIC) history for chart overlay
 * Returns cumulative percentage change from the first day in the series
 */
export function getNASDAQHistory(days: number = 20, endDate?: string): NASDAQData[] {
  const date = endDate || getLatestTradingDate();
  const rows = db
    .prepare(`
      SELECT date, close
      FROM indices_ohlcv
      WHERE index_code = '^IXIC' AND date <= ?
      ORDER BY date DESC
      LIMIT ?
    `)
    .all(date, days + 5) as { date: string; close: number }[];

  if (rows.length === 0) return [];

  // Reverse to chronological order
  const chronological = rows.reverse();
  const firstClose = chronological[0].close;

  return chronological.map(row => ({
    date: row.date,
    close: row.close,
    pct_change: ((row.close / firstClose) - 1) * 100,
  }));
}

/**
 * Get navigation info for a given trading date (prev/next dates)
 */
export function getTradingDateNavigation(date: string): { prevDate: string | null; nextDate: string | null } | null {
  // Get the rank of the current date
  const currentRow = db
    .prepare("SELECT day_rank FROM trading_days WHERE date = ?")
    .get(date) as { day_rank: number } | undefined;

  if (!currentRow) {
    return null;
  }

  const currentRank = currentRow.day_rank;

  // Previous date = higher rank (older)
  const prevRow = db
    .prepare("SELECT date FROM trading_days WHERE day_rank = ?")
    .get(currentRank + 1) as { date: string } | undefined;

  // Next date = lower rank (newer), but not below 1
  const nextRow = currentRank > 1
    ? db.prepare("SELECT date FROM trading_days WHERE day_rank = ?").get(currentRank - 1) as { date: string } | undefined
    : undefined;

  return {
    prevDate: prevRow?.date ?? null,
    nextDate: nextRow?.date ?? null,
  };
}
