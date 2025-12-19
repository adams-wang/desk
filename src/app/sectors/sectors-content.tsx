"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import {
  RotationBanner,
  SignalSummaryCards,
  SectorRankingsTable,
  L2ReportSheet,
} from "@/components/sectors";
import type { SectorRotationData } from "@/lib/queries/sectors";

interface SectorsContentProps {
  data: SectorRotationData;
  currentDate: string;
}

export function SectorsContent({ data, currentDate }: SectorsContentProps) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Sector Rotation</h2>
        {data.reportPath && (
          <button
            onClick={() => setReportOpen(true)}
            className="group flex items-center gap-1.5 text-sm text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span className="group-hover:underline underline-offset-4">View Report</span>
          </button>
        )}
      </div>

      {/* Rotation Banner */}
      <RotationBanner
        rotationBias={data.rotationBias}
        cyclePhase={data.cyclePhase}
        tradingDate={currentDate}
      />

      {/* Signal Summary Cards */}
      <SignalSummaryCards
        sectors={data.sectors}
        bullishCount={data.bullishCount}
        bearishCount={data.bearishCount}
      />

      {/* Sector Rankings Table */}
      <SectorRankingsTable
        sectors={data.sectors}
        currentDate={currentDate}
      />

      {/* L2 Report Sheet */}
      <L2ReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        tradingDate={currentDate}
      />
    </div>
  );
}
