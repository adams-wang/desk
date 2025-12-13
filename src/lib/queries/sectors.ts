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
 * Get sector ETF MRS data for the latest trading date
 */
export function getSectorMRS(): SectorMRS[] {
  const log = getLogger();
  const date = getLatestTradingDate();
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
