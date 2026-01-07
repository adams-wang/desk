"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ArrowRight, TrendingUp, TrendingDown, Search } from "lucide-react";
import {
  RegimeBanner,
  IndicesGrid,
  MarketHealthCard,
  BlockersCard,
} from "@/components/market";
import { L1ReportSheet } from "./l1-report-sheet";
import type {
  MarketOverview,
  RegimeHistoryItem,
  IndexWithSparkline,
} from "@/lib/queries/market";

interface MarketContentProps {
  overview: MarketOverview;
  currentDate: string;
  regimeHistory: RegimeHistoryItem[];
  indicesWithSparklines: IndexWithSparkline[];
}

export function MarketContent({
  overview,
  currentDate,
  regimeHistory,
  indicesWithSparklines,
}: MarketContentProps) {
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);

  // Navigate to indices detail page
  const handleIndicesClick = () => {
    router.push(`/indices?date=${currentDate}`);
  };

  // Determine stocks link based on regime
  const stocksLinkText = overview.regime === "RISK_ON" || overview.regime === "NORMAL"
    ? "View Strong Stocks"
    : "View Defensive Stocks";

  // Strong Stocks: V20=BUY, sorted by Sharpe DESC
  // Defensive Stocks: DV=P (prefer), sort by beta (lowest first)
  const stocksLinkHref = overview.regime === "RISK_ON" || overview.regime === "NORMAL"
    ? `/stocks?v20=BUY&sort=sharpe_20&order=desc&date=${currentDate}`
    : `/stocks?dv=P&sort=beta_60&order=asc&date=${currentDate}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Market Overview</h2>
        {overview.reportPath && (
          <button
            onClick={() => setReportOpen(true)}
            className="group flex items-center gap-1.5 text-sm text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span className="group-hover:underline underline-offset-4">View Report</span>
          </button>
        )}
      </div>

      {/* Regime Banner */}
      <RegimeBanner
        regime={overview.regime}
        positionPct={overview.positionPct}
        transition={overview.regimeTransition}
        confidence={overview.confidence}
        tradingDate={overview.tradingDate}
        regimeHistory={regimeHistory}
        yields={overview.yields}
      />

      {/* Indices Grid with Sparklines - click any to drill down */}
      <IndicesGrid indices={indicesWithSparklines} onIndexClick={handleIndicesClick} />

      {/* Market Health + Blockers */}
      <div className="grid gap-4 md:grid-cols-2">
        <MarketHealthCard
          vix={overview.vix}
          breadth={overview.breadth}
          sentiment={overview.sentiment}
        />
        <BlockersCard
          hardBlocks={overview.hardBlocks}
          fomcDaysAway={overview.fomcDaysAway}
          sahmTriggered={overview.sahmTriggered}
          vixValue={overview.vix.value}
        />
      </div>

      {/* Quick Action Links */}
      <div className="flex items-center gap-4">
        <Link
          href={stocksLinkHref}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {overview.regime === "RISK_ON" || overview.regime === "NORMAL" ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-amber-500" />
          )}
          {stocksLinkText}
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href={`/stocks?date=${currentDate}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Search className="h-4 w-4" />
          Browse All Stocks
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* L1 Report Sheet */}
      <L1ReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        reportPath={overview.reportPath}
        tradingDate={overview.tradingDate}
      />
    </div>
  );
}
