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

export type Zone = 'C' | 'D' | 'E' | 'A' | 'F';
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

const ZONE_THRESHOLDS = {
  C: -3.5,  // Toxic
  D: -0.5,  // Ignition upper bound
  E: 0.5,   // Noise upper bound
  F: 2.8,   // Momentum threshold
};

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
// Classification Functions
// =============================================================================

export function classifyZone(mrs20: number): Zone {
  if (mrs20 <= ZONE_THRESHOLDS.C) return 'C';
  if (mrs20 < ZONE_THRESHOLDS.D) return 'D';
  if (mrs20 <= ZONE_THRESHOLDS.E) return 'E';
  if (mrs20 < ZONE_THRESHOLDS.F) return 'A';
  return 'F';
}

export function classifySignal(mrs20: number, mrs5: number, roc3: number): { signal: Signal; modifier: number } {
  // Zone C (Toxic): S <= -3.5%
  if (mrs20 <= ZONE_THRESHOLDS.C) {
    if (mrs5 > 0) return { signal: 'RECOVERY_STRONG', modifier: 1.5 };
    if (roc3 > 0) return { signal: 'RECOVERY_EARLY', modifier: 1.2 };
    return { signal: 'TOXIC', modifier: 0.25 };
  }

  // Zone D (Ignition): -3.5% < S < -0.5%
  if (mrs20 < ZONE_THRESHOLDS.D) {
    if (mrs5 > 0) return { signal: 'IGNITION', modifier: 1.2 };
    return { signal: 'AVOID', modifier: 0.5 };
  }

  // Zone E (Noise): -0.5% <= S <= 0.5%
  if (mrs20 <= ZONE_THRESHOLDS.E) return { signal: 'NEUTRAL', modifier: 1.0 };

  // Zone B (Weakening): S > 0% AND MRS_5 < 0 (cuts across A and F)
  if (mrs5 < 0) return { signal: 'WEAKENING', modifier: 0.75 };

  // Zone A (Trend): 0.5% < S < 2.8%
  if (mrs20 < ZONE_THRESHOLDS.F) return { signal: 'TREND', modifier: 1.2 };

  // Zone F (Momentum): S >= 2.8%
  return { signal: 'MOMENTUM', modifier: 1.2 };
}

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

  // Get the dates we need
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

  // Return in chronological order (oldest first)
  return result.reverse();
}

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

// =============================================================================
// Main Sector Rotation Query (with L2 signal classification)
// =============================================================================

interface RawSectorRow {
  sector_name: string;
  etf_ticker: string;
  mrs_5: number | null;
  mrs_20: number | null;
  close: number | null;
  mrs_20_3d_ago: number | null;
}

/**
 * Get complete sector rotation data with signals, zones, and derived metrics
 */
export function getSectorRotationData(endDate?: string): SectorRotationData {
  const log = getLogger();
  const date = endDate || getLatestTradingDate();
  const startTime = Date.now();

  // Get the date 3 trading days ago for ROC_3 calculation
  const date3dAgo = db
    .prepare(`
      SELECT date FROM trading_days
      WHERE date < ?
      ORDER BY date DESC
      LIMIT 1 OFFSET 2
    `)
    .get(date) as { date: string } | undefined;

  // Fetch current sector data with 3-day-ago MRS_20 for ROC_3
  const rows = db
    .prepare(`
      SELECT
        a.sector_name,
        a.etf_ticker,
        a.mrs_5,
        a.mrs_20,
        a.close,
        b.mrs_20 as mrs_20_3d_ago
      FROM sector_etf_indicators a
      LEFT JOIN sector_etf_indicators b
        ON a.etf_ticker = b.etf_ticker
        AND b.date = ?
      WHERE a.date = ?
      ORDER BY a.mrs_20 DESC
    `)
    .all(date3dAgo?.date || date, date) as RawSectorRow[];

  // Transform to SectorWithSignal with classifications
  const sectors: SectorWithSignal[] = rows.map((row, idx) => {
    const mrs20 = row.mrs_20 ?? 0;
    const mrs5 = row.mrs_5 ?? 0;
    const roc3 = row.mrs_20_3d_ago !== null ? mrs20 - row.mrs_20_3d_ago : 0;

    const zone = classifyZone(mrs20);
    const { signal, modifier } = classifySignal(mrs20, mrs5, roc3);

    return {
      sector_name: row.sector_name,
      etf_ticker: row.etf_ticker,
      mrs_5: mrs5,
      mrs_20: mrs20,
      roc_3: roc3,
      close: row.close,
      zone,
      signal,
      modifier,
      rank: idx + 1,
    };
  });

  // Derive aggregates
  const rotationBias = deriveRotationBias(sectors);
  const cyclePhase = deriveCyclePhase(sectors);
  const bullishCount = sectors.filter(s => BULLISH_SIGNALS.includes(s.signal)).length;
  const bearishCount = sectors.filter(s => BEARISH_SIGNALS.includes(s.signal)).length;

  // Check for L2 report (try multiple filenames)
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
    "Sector rotation data query"
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
