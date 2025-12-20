import db from "../db";
import { getLatestTradingDate } from "./trading-days";
import { getLogger } from "../logger";

// =============================================================================
// Types
// =============================================================================

export interface SectorMRS {
  sector_name: string;
  etf_ticker: string;
  mrs_5: number | null;
  mrs_20: number | null;
  close: number | null;
}

export type Zone = 'C' | 'D' | 'E' | 'A' | 'B' | 'F';
export type Signal =
  | 'RECOVERY_STRONG' | 'RECOVERY_EARLY' | 'TOXIC'
  | 'IGNITION' | 'AVOID'
  | 'NEUTRAL'
  | 'TREND' | 'MOMENTUM' | 'WEAKENING';
export type RotationBias = 'OFFENSIVE' | 'NEUTRAL' | 'DEFENSIVE';
export type CyclePhase = 'EARLY_EXPANSION' | 'MID_EXPANSION' | 'LATE_EXPANSION' | 'CONTRACTION' | 'NEUTRAL';

export interface SectorWithSignal {
  sector_name: string;
  etf_ticker: string;
  mrs_5: number;
  mrs_20: number;
  roc_3: number;
  close: number | null;
  zone: Zone;
  signal: Signal;
  modifier: number;
  rank: number;
}

export interface SectorRotationData {
  sectors: SectorWithSignal[];
  rotationBias: RotationBias;
  cyclePhase: CyclePhase;
  bullishCount: number;
  bearishCount: number;
  reportPath: string | null;
}

// =============================================================================
// Constants (from L2 spec v6.1)
// =============================================================================

const OFFENSIVE_ETFS = ['XLK', 'XLY', 'XLF', 'XLC', 'XLI'];
const DEFENSIVE_ETFS = ['XLV', 'XLP', 'XLU', 'XLRE'];
const BULLISH_SIGNALS: Signal[] = ['RECOVERY_STRONG', 'RECOVERY_EARLY', 'IGNITION', 'TREND', 'MOMENTUM'];
const BEARISH_SIGNALS: Signal[] = ['TOXIC', 'AVOID', 'WEAKENING'];

const CYCLE_SECTORS = {
  early: ['XLF', 'XLY'],
  mid: ['XLK', 'XLI', 'XLC'],
  late: ['XLE', 'XLB'],
  defensive: ['XLU', 'XLP', 'XLV', 'XLRE'],
};

// =============================================================================
// Derived Metrics Functions
// =============================================================================

export function deriveRotationBias(sectors: SectorWithSignal[]): RotationBias {
  const countNet = (etfs: string[]) => {
    const group = sectors.filter(s => etfs.includes(s.etf_ticker));
    const bullish = group.filter(s => BULLISH_SIGNALS.includes(s.signal)).length;
    const bearish = group.filter(s => BEARISH_SIGNALS.includes(s.signal)).length;
    return bullish - bearish;
  };

  const offensiveStrength = countNet(OFFENSIVE_ETFS);
  const defensiveStrength = countNet(DEFENSIVE_ETFS);

  if (offensiveStrength >= 2 && defensiveStrength <= -1) return 'OFFENSIVE';
  if (defensiveStrength >= 2 && offensiveStrength <= -1) return 'DEFENSIVE';
  return 'NEUTRAL';
}

export function deriveCyclePhase(sectors: SectorWithSignal[]): CyclePhase {
  const countBullish = (etfs: string[]) =>
    sectors.filter(s => etfs.includes(s.etf_ticker) && BULLISH_SIGNALS.includes(s.signal)).length;

  const scores = {
    early: countBullish(CYCLE_SECTORS.early),
    mid: countBullish(CYCLE_SECTORS.mid),
    late: countBullish(CYCLE_SECTORS.late),
    defensive: countBullish(CYCLE_SECTORS.defensive),
  };

  const max = Math.max(...Object.values(scores));
  if (max === 0) return 'NEUTRAL';

  if (scores.defensive === max) return 'CONTRACTION';
  if (scores.early === max) return 'EARLY_EXPANSION';
  if (scores.mid === max) return 'MID_EXPANSION';
  if (scores.late === max) return 'LATE_EXPANSION';
  return 'NEUTRAL';
}

// =============================================================================
// Database Row Types
// =============================================================================

interface L2SectorRankingRow {
  etf: string;
  sector_name: string;
  rank: number;
  signal: string;
  zone: string;
  modifier: number;
  mrs_20: number;
  mrs_5: number;
  roc_3: number;
}

// =============================================================================
// Main Sector Rotation Query (from l2_sector_rankings)
// =============================================================================

/**
 * Get complete sector rotation data from pre-computed l2_sector_rankings table
 */
export function getSectorRotationData(endDate?: string): SectorRotationData {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
  const startTime = Date.now();
  const contractId = `l2_${date}`;

  const rows = db
    .prepare(`
      SELECT etf, sector_name, rank, signal, zone, modifier, mrs_20, mrs_5, roc_3
      FROM l2_sector_rankings
      WHERE contract_id = ?
      ORDER BY mrs_20 DESC
    `)
    .all(contractId) as L2SectorRankingRow[];

  // Recalculate rank based on MRS20 (highest MRS20 = rank 1)
  const sectors: SectorWithSignal[] = rows.map((row, index) => ({
    sector_name: row.sector_name,
    etf_ticker: row.etf,
    mrs_5: row.mrs_5,
    mrs_20: row.mrs_20,
    roc_3: row.roc_3,
    close: null,
    zone: row.zone as Zone,
    signal: row.signal as Signal,
    modifier: row.modifier,
    rank: index + 1, // Rank by MRS20 descending
  }));

  // Derive aggregates
  const rotationBias = deriveRotationBias(sectors);
  const cyclePhase = deriveCyclePhase(sectors);
  const bullishCount = sectors.filter(s => BULLISH_SIGNALS.includes(s.signal)).length;
  const bearishCount = sectors.filter(s => BEARISH_SIGNALS.includes(s.signal)).length;

  // Check for L2 report
  const fs = require('fs');
  const reportNames = ['L2_Sector_Analysis.md', 'L2_Sector_Rotation.md', 'l2.md'];
  let reportPath: string | null = null;
  for (const name of reportNames) {
    const path = `/Volumes/Data/quant/reports/${date}/${name}`;
    if (fs.existsSync(path)) {
      reportPath = path;
      break;
    }
  }

  log.debug(
    { date, sectorCount: sectors.length, rotationBias, cyclePhase, latencyMs: Date.now() - startTime },
    "Sector rotation data query (l2_sector_rankings)"
  );

  return {
    sectors,
    rotationBias,
    cyclePhase,
    bullishCount,
    bearishCount,
    reportPath,
  };
}

// =============================================================================
// Sector Rotation History (for playback animation)
// =============================================================================

export interface SectorRotationHistoryDay {
  date: string;
  sectors: SectorWithSignal[];
  rotationBias: RotationBias;
  cyclePhase: CyclePhase;
}

/**
 * Get sector rotation data for multiple days from l2_sector_rankings
 */
export function getSectorRotationHistory(days: number = 10, endDate?: string): SectorRotationHistoryDay[] {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
  const startTime = Date.now();

  // Get available contract_ids up to the requested number of days
  const contracts = db
    .prepare(`
      SELECT DISTINCT contract_id
      FROM l2_sector_rankings
      WHERE contract_id <= ?
      ORDER BY contract_id DESC
      LIMIT ?
    `)
    .all(`l2_${date}`, days) as { contract_id: string }[];

  const result: SectorRotationHistoryDay[] = [];

  for (const { contract_id } of contracts) {
    const dateStr = contract_id.replace('l2_', '');

    const rows = db
      .prepare(`
        SELECT etf, sector_name, rank, signal, zone, modifier, mrs_20, mrs_5, roc_3
        FROM l2_sector_rankings
        WHERE contract_id = ?
        ORDER BY mrs_20 DESC
      `)
      .all(contract_id) as L2SectorRankingRow[];

    // Recalculate rank based on MRS20 (highest MRS20 = rank 1)
    const sectors: SectorWithSignal[] = rows.map((row, index) => ({
      sector_name: row.sector_name,
      etf_ticker: row.etf,
      mrs_5: row.mrs_5,
      mrs_20: row.mrs_20,
      roc_3: row.roc_3,
      close: null,
      zone: row.zone as Zone,
      signal: row.signal as Signal,
      modifier: row.modifier,
      rank: index + 1, // Rank by MRS20 descending
    }));

    const rotationBias = deriveRotationBias(sectors);
    const cyclePhase = deriveCyclePhase(sectors);

    result.push({ date: dateStr, sectors, rotationBias, cyclePhase });
  }

  log.debug(
    { days, dates: result.length, latencyMs: Date.now() - startTime },
    "Sector rotation history query (l2_sector_rankings)"
  );

  // Return in chronological order (oldest first)
  return result.reverse();
}

// =============================================================================
// Legacy Functions (still used by stock page and API routes)
// =============================================================================

/**
 * Get sector ETF MRS data for a specific trading date
 * Used by: API routes, stock page
 */
export function getSectorMRS(endDate?: string): SectorMRS[] {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
  const startTime = Date.now();

  const rows = db
    .prepare(`
      SELECT sector_name, etf_ticker, mrs_5, mrs_20, close
      FROM sector_etf_indicators
      WHERE date = ?
      ORDER BY mrs_20 ASC
    `)
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
    .prepare(`SELECT sector FROM stocks_metadata WHERE ticker = ?`)
    .get(ticker.toUpperCase()) as { sector: string } | undefined;

  return row?.sector || null;
}

export interface SectorRankHistory {
  date: string;
  rank: number;
  total: number;
}

export interface SectorMRSHistoryDay {
  date: string;
  sectors: SectorMRS[];
}

/**
 * Get sector MRS data for multiple days (for animation)
 */
export function getSectorMRSHistory(days: number = 5, endDate?: string): SectorMRSHistoryDay[] {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
  const startTime = Date.now();

  const dates = db
    .prepare(`
      SELECT DISTINCT date FROM sector_etf_indicators
      WHERE date <= ?
      ORDER BY date DESC
      LIMIT ?
    `)
    .all(date, days) as { date: string }[];

  const result: SectorMRSHistoryDay[] = [];

  for (const { date: d } of dates) {
    const sectors = db
      .prepare(`
        SELECT sector_name, etf_ticker, mrs_5, mrs_20, close
        FROM sector_etf_indicators
        WHERE date = ?
        ORDER BY mrs_20 DESC
      `)
      .all(d) as SectorMRS[];

    result.push({ date: d, sectors });
  }

  log.debug(
    { days, dates: result.length, latencyMs: Date.now() - startTime },
    "Sector MRS history query"
  );

  return result.reverse();
}

/**
 * Get historical sector ranks for a specific sector
 */
export function getSectorRankHistory(sectorName: string, days: number = 20, endDate?: string): SectorRankHistory[] {
  const date = endDate || getLatestTradingDate();

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

  return result.reverse();
}

/**
 * Get all sector ranks for a specific date
 * Returns a map of sector name -> { rank, total }
 */
export function getSectorRanks(endDate?: string): Map<string, { rank: number; total: number }> {
  const date = endDate || getLatestTradingDate();

  const sectors = db
    .prepare(`
      SELECT sector_name, mrs_20
      FROM sector_etf_indicators
      WHERE date = ?
      ORDER BY mrs_20 DESC
    `)
    .all(date) as { sector_name: string; mrs_20: number }[];

  const result = new Map<string, { rank: number; total: number }>();
  sectors.forEach((s, idx) => {
    result.set(s.sector_name, { rank: idx + 1, total: sectors.length });
  });

  return result;
}
