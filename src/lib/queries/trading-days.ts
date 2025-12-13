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
