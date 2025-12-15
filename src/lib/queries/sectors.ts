import db from "../db";
import { getLatestTradingDate } from "./trading-days";
import { getLogger } from "../logger";

export interface SectorMRS {
  sector_name: string;
  etf_ticker: string;
  mrs_5: number | null;
  mrs_20: number | null;
  close: number | null;
}

/**
 * Get sector ETF MRS data for a specific trading date
 */
export function getSectorMRS(endDate?: string): SectorMRS[] {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
  const startTime = Date.now();

  const rows = db
    .prepare(
      `
    SELECT sector_name, etf_ticker, mrs_5, mrs_20, close
    FROM sector_etf_indicators
    WHERE date = ?
    ORDER BY mrs_20 ASC
  `
    )
    .all(date) as SectorMRS[];

  log.debug(
    { date, rowCount: rows.length, latencyMs: Date.now() - startTime },
    "Sector MRS query"
  );

  return rows;
}

/**
 * Get sector for a specific stock
 */
export function getStockSector(ticker: string): string | null {
  const row = db
    .prepare(
      `
    SELECT sector FROM stocks_metadata WHERE ticker = ?
  `
    )
    .get(ticker.toUpperCase()) as { sector: string } | undefined;

  return row?.sector || null;
}

export interface SectorRankHistory {
  date: string;
  rank: number;
  total: number;
}

/**
 * Get historical sector ranks for a specific sector
 * Ranks are based on MRS 20 (higher = better rank)
 */
export function getSectorRankHistory(sectorName: string, days: number = 20, endDate?: string): SectorRankHistory[] {
  const date = endDate || getLatestTradingDate();

  // Get all dates we need
  const dates = db
    .prepare(`
      SELECT DISTINCT date FROM sector_etf_indicators
      WHERE date <= ?
      ORDER BY date DESC
      LIMIT ?
    `)
    .all(date, days) as { date: string }[];

  const result: SectorRankHistory[] = [];

  for (const { date: d } of dates) {
    // Get all sectors for this date, ordered by MRS 20 descending
    const sectors = db
      .prepare(`
        SELECT sector_name, mrs_20
        FROM sector_etf_indicators
        WHERE date = ?
        ORDER BY mrs_20 DESC
      `)
      .all(d) as { sector_name: string; mrs_20: number }[];

    const rank = sectors.findIndex(s => s.sector_name === sectorName) + 1;
    if (rank > 0) {
      result.push({ date: d, rank, total: sectors.length });
    }
  }

  return result.reverse(); // Chronological order
}
