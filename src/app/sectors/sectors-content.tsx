"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import {
  RotationBanner,
  SectorRankingsTable,
  SectorRotationMap,
  L2ReportSheet,
} from "@/components/sectors";
import type { SectorRotationData, SectorRotationHistoryDay } from "@/lib/queries/sectors";

interface SectorsContentProps {
  data: SectorRotationData;
  currentDate: string;
  history?: SectorRotationHistoryDay[];
}

export function SectorsContent({ data, currentDate, history }: SectorsContentProps) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="space-y-4">
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
        sectors={data.sectors}
      />

      {/* Sector Rankings Table (with integrated MRS chart) */}
      <SectorRankingsTable
        sectors={data.sectors}
        currentDate={currentDate}
        history={history}
      />

      {/* Sector Rotation Map Visualization */}
      <SectorRotationMap sectors={data.sectors} history={history} />

      {/* L2 Report Sheet */}
      <L2ReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        tradingDate={currentDate}
      />
    </div>
  );
}
