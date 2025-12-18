"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import {
  RegimeBanner,
  IndicesGrid,
  MarketHealthCard,
  BlockersCard,
} from "@/components/market";
import { L1ReportSheet } from "./l1-report-sheet";
import type { MarketOverview } from "@/lib/queries/market";

interface MarketContentProps {
  overview: MarketOverview;
  currentDate: string;
}

export function MarketContent({
  overview,
  currentDate,
}: MarketContentProps) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Market Overview</h2>
        {overview.reportPath && (
          <Button variant="outline" size="sm" onClick={() => setReportOpen(true)} className="gap-2">
            <FileText className="h-4 w-4" />
            View Report
          </Button>
        )}
      </div>

      {/* Regime Banner */}
      <RegimeBanner
        regime={overview.regime}
        positionPct={overview.positionPct}
        transition={overview.regimeTransition}
        confidence={overview.confidence}
        tradingDate={overview.tradingDate}
      />

      {/* Indices Grid */}
      <IndicesGrid indices={overview.indices} />

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

      {/* Yields Card (if available) */}
      {overview.yields && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Treasury Yields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">3-Month</div>
                <div className="text-lg font-bold tabular-nums">
                  {overview.yields.treasury3m.toFixed(2)}%
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">5-Year</div>
                <div className="text-lg font-bold tabular-nums">
                  {overview.yields.treasury5y.toFixed(2)}%
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">10-Year</div>
                <div className="text-lg font-bold tabular-nums">
                  {overview.yields.treasury10y.toFixed(2)}%
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">5Y-10Y Spread</div>
                <div className="text-lg font-bold tabular-nums">
                  {overview.yields.spread5y10y > 0 ? "+" : ""}
                  {overview.yields.spread5y10y.toFixed(0)} bps
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">3M-10Y Spread</div>
                <div className="text-lg font-bold tabular-nums">
                  {overview.yields.spread3m10y > 0 ? "+" : ""}
                  {overview.yields.spread3m10y.toFixed(0)} bps
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
