"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SectorPerformance {
  sector: string;
  dayChange: number;
  weekChange: number;
  mrs20: number | null;
}

interface SectorStripProps {
  sectors: SectorPerformance[];
}

// Abbreviate sector names
const sectorAbbrev: Record<string, string> = {
  "Technology": "Tech",
  "Communication Services": "Comm",
  "Consumer Cyclical": "Cycl",
  "Consumer Defensive": "Def",
  "Healthcare": "Hlth",
  "Financial Services": "Fin",
  "Industrials": "Ind",
  "Basic Materials": "Mat",
  "Real Estate": "RE",
  "Utilities": "Util",
  "Energy": "Engy",
};

function getHeatColor(value: number): string {
  // Map MRS value (-100 to 100) to color
  if (value >= 50) return "bg-emerald-500";
  if (value >= 20) return "bg-emerald-400";
  if (value >= 0) return "bg-emerald-300/70";
  if (value >= -20) return "bg-red-300/70";
  if (value >= -50) return "bg-red-400";
  return "bg-red-500";
}

export function SectorStrip({ sectors }: SectorStripProps) {
  if (!sectors || sectors.length === 0) return null;

  // Sort by MRS (strongest to weakest)
  const sorted = [...sectors].sort((a, b) => (b.mrs20 ?? 0) - (a.mrs20 ?? 0));

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">Sectors:</span>
        {sorted.map((sector) => {
          const abbrev = sectorAbbrev[sector.sector] || sector.sector.slice(0, 4);
          const mrs = sector.mrs20 ?? 0;

          return (
            <Tooltip key={sector.sector}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    getHeatColor(mrs),
                    mrs >= 0 ? "text-emerald-950" : "text-red-950"
                  )}
                >
                  {abbrev}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="font-medium">{sector.sector}</div>
                <div className="text-muted-foreground">
                  MRS: {mrs.toFixed(0)} · Day: {sector.dayChange >= 0 ? "+" : ""}{sector.dayChange.toFixed(2)}%
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
