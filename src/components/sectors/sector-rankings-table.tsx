"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SectorWithSignal, Zone, Signal } from "@/lib/queries/sectors";

interface SectorRankingsTableProps {
  sectors: SectorWithSignal[];
  currentDate: string;
}

const zoneConfig: Record<Zone, { label: string; bg: string; text: string; description: string }> = {
  C: { label: "Toxic", bg: "bg-red-500/20", text: "text-red-500", description: "MRS_20 ≤ -3.5%" },
  D: { label: "Ignition", bg: "bg-amber-500/20", text: "text-amber-600", description: "-3.5% < MRS_20 < -0.5%" },
  E: { label: "Noise", bg: "bg-zinc-500/20", text: "text-zinc-500", description: "-0.5% ≤ MRS_20 ≤ 0.5%" },
  A: { label: "Trend", bg: "bg-blue-500/20", text: "text-blue-500", description: "0.5% < MRS_20 < 2.8%" },
  F: { label: "Momentum", bg: "bg-emerald-500/20", text: "text-emerald-600", description: "MRS_20 ≥ 2.8%" },
};

const signalConfig: Record<Signal, { bg: string; text: string; description: string }> = {
  RECOVERY_STRONG: { bg: "bg-emerald-500", text: "text-white", description: "Zone C with MRS_5 > 0 (89.5% win)" },
  RECOVERY_EARLY: { bg: "bg-emerald-400", text: "text-white", description: "Zone C with ROC_3 > 0 (61.8% win)" },
  TOXIC: { bg: "bg-red-500", text: "text-white", description: "Zone C, no recovery signal" },
  IGNITION: { bg: "bg-emerald-500", text: "text-white", description: "Zone D with MRS_5 > 0 (61.5% win)" },
  AVOID: { bg: "bg-red-400", text: "text-white", description: "Zone D with MRS_5 ≤ 0" },
  NEUTRAL: { bg: "bg-zinc-400", text: "text-white", description: "Zone E, unclear direction" },
  TREND: { bg: "bg-blue-500", text: "text-white", description: "Zone A, positive momentum" },
  MOMENTUM: { bg: "bg-blue-600", text: "text-white", description: "Zone F, strong momentum" },
  WEAKENING: { bg: "bg-orange-500", text: "text-white", description: "MRS_5 < 0 warning (67% win)" },
};

export function SectorRankingsTable({ sectors, currentDate }: SectorRankingsTableProps) {
  const router = useRouter();

  const handleRowClick = (sectorName: string) => {
    router.push(`/stocks?sector=${encodeURIComponent(sectorName)}&date=${currentDate}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sector Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground w-12">#</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Sector</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground w-16">ETF</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground w-20">Zone</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground w-32">Signal</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground w-16">Mod</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground w-20">MRS 20</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground w-20">MRS 5</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((sector) => {
                  const zone = zoneConfig[sector.zone];
                  const signal = signalConfig[sector.signal];
                  const mrs20Positive = sector.mrs_20 >= 0;
                  const mrs5Positive = sector.mrs_5 >= 0;

                  return (
                    <tr
                      key={sector.etf_ticker}
                      onClick={() => handleRowClick(sector.sector_name)}
                      className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 font-mono text-muted-foreground">
                        {sector.rank}
                      </td>
                      <td className="py-2 px-2 font-medium">
                        {sector.sector_name}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground font-mono">
                        {sector.etf_ticker}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium",
                                zone.bg,
                                zone.text
                              )}
                            >
                              {zone.label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {zone.description}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="py-2 px-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                signal.bg,
                                signal.text
                              )}
                            >
                              {sector.signal.replace('_', ' ')}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-[200px]">
                            {signal.description}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        <span
                          className={cn(
                            sector.modifier >= 1.0 ? "text-emerald-500" : "text-red-500"
                          )}
                        >
                          {sector.modifier.toFixed(2)}x
                        </span>
                      </td>
                      <td
                        className={cn(
                          "py-2 px-2 text-right font-mono tabular-nums",
                          mrs20Positive ? "text-emerald-500" : "text-red-500"
                        )}
                      >
                        {sector.mrs_20 >= 0 ? "+" : ""}{sector.mrs_20.toFixed(2)}%
                      </td>
                      <td
                        className={cn(
                          "py-2 px-2 text-right font-mono tabular-nums",
                          mrs5Positive ? "text-emerald-500" : "text-red-500"
                        )}
                      >
                        {sector.mrs_5 >= 0 ? "+" : ""}{sector.mrs_5.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
