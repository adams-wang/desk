"use client";

import { useState } from "react";
import { PriceVolumeChart } from "@/components/charts";
import { ReportSheet } from "@/components/report-sheet";

interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  volume_10ma: number | null;
  volume_10_ts: number | null;
  gap_type: string | null;
  gap_pct: number | null;
  gap_filled: string | null;
  gap_conclusion: string | null;
  gap_interpretation: string | null;
  mrs_20: number | null;
  mrs_20_ts: number | null;
  ofd_code: string | null;
  ofd_conclusion: string | null;
  ofd_interpretation: string | null;
  pattern: string | null;
  pattern_conclusion: string | null;
  pattern_interpretation: string | null;
  body_size_pct: number | null;
  candle_volume_ratio: number | null;
  upper_wick_ratio: number | null;
  lower_wick_ratio: number | null;
  verdict_10: string | null;
  verdict_20: string | null;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  rsi_14: number | null;
  macd_line: number | null;
  macd_signal: number | null;
}

interface VIXData {
  date: string;
  vix_close: number;
  regime: "risk_on" | "normal" | "risk_off" | "crisis";
}

interface SectorRankData {
  date: string;
  rank: number;
  total: number;
}

interface ChartWithReportProps {
  data: OHLCVData[];
  vixHistory?: VIXData[];
  sectorRankHistory?: SectorRankData[];
  height?: number;
  currentRange?: 20 | 40 | 60;
  ticker: string;
}

export function ChartWithReport({
  data,
  vixHistory,
  sectorRankHistory,
  height = 560,
  currentRange = 20,
  ticker,
}: ChartWithReportProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDate, setReportDate] = useState<string | undefined>();
  const [initialVariant, setInitialVariant] = useState<"10" | "20">("10");

  const handleVerdictClick = (
    date: string,
    verdict10: string | null,
    verdict20: string | null
  ) => {
    setReportDate(date);
    // Default to MRS 10 if available, otherwise MRS 20
    setInitialVariant(verdict10 ? "10" : "20");
    setReportOpen(true);
  };

  return (
    <>
      <PriceVolumeChart
        data={data}
        vixHistory={vixHistory}
        sectorRankHistory={sectorRankHistory}
        height={height}
        currentRange={currentRange}
        onVerdictClick={handleVerdictClick}
      />
      <ReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        ticker={ticker}
        date={reportDate}
        initialVariant={initialVariant}
      />
    </>
  );
}
