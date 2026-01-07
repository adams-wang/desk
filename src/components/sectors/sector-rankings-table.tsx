"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SectorWithSignal, SectorRotationHistoryDay, Zone, Signal } from "@/lib/queries/sectors";

interface SectorRankingsTableProps {
  sectors: SectorWithSignal[];
  currentDate: string;
  history?: SectorRotationHistoryDay[];
}

// Mini sparkline component for rank history with dots and numbers at bottom
function RankSparkline({
  ranks,
  dates,
  zones,
  signals
}: {
  ranks: number[];
  dates: string[];
  zones?: string[];
  signals?: string[];
}) {
  const totalSectors = 11;
  const chartHeight = 28;
  const numbersHeight = 12;
  const height = chartHeight + numbersHeight;
  const width = 110;
  const padding = { x: 5, y: 3 };
  const dotRadius = 2.5;

  // Calculate positions for dots (rank 1 = top, rank 11 = bottom)
  const points = ranks.map((rank, i) => {
    const x = padding.x + (i / (ranks.length - 1)) * (width - padding.x * 2);
    const y = padding.y + ((rank - 1) / (totalSectors - 1)) * (chartHeight - padding.y * 2);
    return { x, y, rank };
  });

  // Determine trend color based on first vs last rank
  const firstRank = ranks[0];
  const lastRank = ranks[ranks.length - 1];
  const isImproving = lastRank < firstRank;
  const isWorsening = lastRank > firstRank;
  const trendColor = isImproving ? "#22c55e" : isWorsening ? "#ef4444" : "#71717a";

  // Build path for line
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <svg
          width={width}
          height={height}
          className="inline-block ml-4 cursor-default"
          viewBox={`0 0 ${width} ${height}`}
        >
          {/* Line connecting dots */}
          <path
            d={pathD}
            fill="none"
            stroke={trendColor}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.5}
          />
          {/* Dots for each day */}
          {points.map((p, i) => (
            <circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? dotRadius + 1 : dotRadius}
              fill={i === points.length - 1 ? trendColor : "currentColor"}
              opacity={i === points.length - 1 ? 1 : 0.5}
            />
          ))}
          {/* Rank numbers at bottom */}
          {points.map((p, i) => (
            <text
              key={`num-${i}`}
              x={p.x}
              y={chartHeight + 7}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fontWeight={i === points.length - 1 ? 700 : 500}
              fill={i === points.length - 1 ? trendColor : "currentColor"}
              opacity={i === points.length - 1 ? 1 : 0.85}
            >
              {p.rank}
            </text>
          ))}
        </svg>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs font-mono p-2">
        <table className="border-collapse">
          <tbody>
            {[...dates].reverse().map((date, i) => {
              const idx = dates.length - 1 - i;
              return (
                <tr key={date}>
                  <td className="text-muted-foreground pr-2">{date.slice(5)}:</td>
                  <td className={cn(
                    "text-right pr-6",
                    ranks[idx] <= 3 ? "text-emerald-500" :
                    ranks[idx] >= 9 ? "text-red-500" : ""
                  )}>#{ranks[idx]}</td>
                  <td className="text-muted-foreground/70 pr-1 text-right">{zones?.[idx] || ''}</td>
                  <td className="text-muted-foreground/30 px-1">|</td>
                  <td className={cn(
                    "text-left pl-1",
                    signals?.[idx]?.includes("MOMENTUM") || signals?.[idx]?.includes("TREND") ? "text-blue-400" :
                    signals?.[idx]?.includes("AVOID") || signals?.[idx]?.includes("TOXIC") ? "text-red-400" :
                    signals?.[idx]?.includes("WEAKENING") ? "text-orange-400" : "text-muted-foreground"
                  )}>{signals?.[idx] || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TooltipContent>
    </Tooltip>
  );
}

// Zone v7.0 configuration
const zoneConfig: Record<Zone, { label: string; bg: string; text: string; description: string }> = {
  A: { label: "Trend", bg: "bg-blue-500/20", text: "text-blue-500", description: "0.5% < 20d Strength < 2.8%, 5d > 0" },
  B: { label: "Weakening", bg: "bg-orange-500/20", text: "text-orange-500", description: "5d Strength < 0 (momentum fading)" },
  C: { label: "Avoid", bg: "bg-red-400/20", text: "text-red-400", description: "-3.5% < 20d Strength < -0.5%, 5d ≤ 0" },
  D: { label: "Ignition", bg: "bg-amber-500/20", text: "text-amber-600", description: "-3.5% < 20d Strength < -0.5%, 5d > 0" },
  E: { label: "Neutral", bg: "bg-zinc-500/20", text: "text-zinc-500", description: "-0.5% ≤ 20d Strength ≤ 0.5%" },
  F: { label: "Momentum", bg: "bg-emerald-500/20", text: "text-emerald-600", description: "20d Strength ≥ 2.8%" },
  G: { label: "Extreme", bg: "bg-red-600/20", text: "text-red-600", description: "20d Strength ≤ -3.5% (toxic or recovery)" },
};

// Signal v7.0 configuration
const signalConfig: Record<Signal, { bg: string; text: string; description: string }> = {
  RECOVERY_STRONG: { bg: "bg-emerald-500", text: "text-white", description: "Zone G with 5d Strength > 0 (89.5% win)" },
  RECOVERY_EARLY: { bg: "bg-emerald-400", text: "text-white", description: "Zone G with ROC_3 > 0 (61.8% win)" },
  TOXIC: { bg: "bg-red-500", text: "text-white", description: "Zone G, no recovery signal" },
  IGNITION: { bg: "bg-emerald-500", text: "text-white", description: "Zone D with 5d Strength > 0 (61.5% win)" },
  AVOID: { bg: "bg-red-400", text: "text-white", description: "Zone C with 5d Strength ≤ 0" },
  NEUTRAL: { bg: "bg-zinc-400", text: "text-white", description: "Zone E, unclear direction" },
  TREND: { bg: "bg-blue-500", text: "text-white", description: "Zone A, positive momentum" },
  MOMENTUM: { bg: "bg-blue-600", text: "text-white", description: "Zone F, strong momentum" },
  WEAKENING: { bg: "bg-orange-500", text: "text-white", description: "Zone B, 5d Strength < 0 warning (67% win)" },
};

// Inline Strength bar chart for each row
function InlineStrengthBar({ mrs20, mrs5 }: { mrs20: number; mrs5: number }) {
  const width = 320;
  const height = 38;
  const barHeight = 18;
  const padding = 4;

  // Scale: -5% to +5%
  const minValue = -5;
  const maxValue = 5;
  const range = maxValue - minValue;
  const zeroX = padding + ((-minValue) / range) * (width - padding * 2);

  const valueToX = (value: number) => {
    const clampedValue = Math.max(minValue, Math.min(maxValue, value));
    return padding + ((clampedValue - minValue) / range) * (width - padding * 2);
  };

  // Bar color: green for positive, red for negative
  const getBarColor = (mrs: number): string => {
    if (mrs >= 0) return "#22c55e"; // Green for positive
    return "#ef4444"; // Red for negative
  };

  const barX = mrs20 >= 0 ? zeroX : valueToX(mrs20);
  const barWidth = Math.abs(valueToX(mrs20) - zeroX);
  const mrs5X = valueToX(mrs5);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <svg
          width={width}
          height={height}
          className="inline-block cursor-default"
          viewBox={`0 0 ${width} ${height}`}
        >
          {/* Zero line */}
          <line
            x1={zeroX}
            y1={2}
            x2={zeroX}
            y2={height - 2}
            stroke="#71717a"
            strokeWidth={1}
            opacity={0.5}
          />
          {/* Reference lines at -4, -2, +3, +4 with labels */}
          <line
            x1={valueToX(-4)}
            y1={4}
            x2={valueToX(-4)}
            y2={height - 4}
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="2,2"
            opacity={0.3}
          />
          <text x={valueToX(-4)} y={height - 2} textAnchor="middle" fontSize={8} fill="#ef4444" opacity={0.5}>-4</text>
          <line
            x1={valueToX(-2)}
            y1={4}
            x2={valueToX(-2)}
            y2={height - 4}
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="2,2"
            opacity={0.3}
          />
          <text x={valueToX(-2)} y={height - 2} textAnchor="middle" fontSize={8} fill="#ef4444" opacity={0.5}>-2</text>
          <line
            x1={valueToX(3)}
            y1={4}
            x2={valueToX(3)}
            y2={height - 4}
            stroke="#22c55e"
            strokeWidth={1}
            strokeDasharray="2,2"
            opacity={0.3}
          />
          <text x={valueToX(3)} y={height - 2} textAnchor="middle" fontSize={8} fill="#22c55e" opacity={0.5}>+3</text>
          <line
            x1={valueToX(4)}
            y1={4}
            x2={valueToX(4)}
            y2={height - 4}
            stroke="#22c55e"
            strokeWidth={1}
            strokeDasharray="2,2"
            opacity={0.3}
          />
          <text x={valueToX(4)} y={height - 2} textAnchor="middle" fontSize={8} fill="#22c55e" opacity={0.5}>+4</text>
          {/* MRS 20 Bar */}
          <rect
            x={barX}
            y={(height - 10 - barHeight) / 2}
            width={Math.max(barWidth, 2)}
            height={barHeight}
            fill={getBarColor(mrs20)}
            opacity={0.85}
            rx={2}
          />
          {/* MRS 20 (MRS 5) label */}
          <text
            x={mrs20 >= 0 ? Math.min(valueToX(mrs20) + 3, width - 60) : Math.max(valueToX(mrs20) - 3, 60)}
            y={(height - 10) / 2}
            textAnchor={mrs20 >= 0 ? "start" : "end"}
            dominantBaseline="middle"
            fontSize={10}
            fontWeight={600}
            fill="#374151"
            fontFamily="ui-monospace, monospace"
          >
            {mrs20 >= 0 ? "+" : ""}{mrs20.toFixed(1)} <tspan fill="#f97316" fontSize={9}>({mrs5 >= 0 ? "+" : ""}{mrs5.toFixed(1)})</tspan>
          </text>
          {/* MRS 5 dot */}
          <circle
            cx={mrs5X}
            cy={(height - 10) / 2}
            r={5}
            fill="#f97316"
            stroke="white"
            strokeWidth={1.5}
          />
        </svg>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="space-y-1">
          <div>20d Strength: <span className={mrs20 >= 0 ? "text-emerald-400" : "text-red-400"}>{mrs20 >= 0 ? "+" : ""}{mrs20.toFixed(2)}%</span></div>
          <div>5d Strength: <span className={mrs5 >= 0 ? "text-emerald-400" : "text-red-400"}>{mrs5 >= 0 ? "+" : ""}{mrs5.toFixed(2)}%</span></div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function SectorRankingsTable({ sectors, currentDate, history }: SectorRankingsTableProps) {
  const router = useRouter();

  // Extract rank history for each sector from the history data
  const rankHistoryMap = useMemo(() => {
    if (!history || history.length < 2) return new Map<string, { ranks: number[]; dates: string[]; zones: string[]; signals: string[] }>();

    const map = new Map<string, { ranks: number[]; dates: string[]; zones: string[]; signals: string[] }>();

    // Get last 10 days (or less if not available)
    const recentHistory = history.slice(-10);

    // For each sector, extract ranks, zones, signals across all days
    for (const sector of sectors) {
      const ranks: number[] = [];
      const dates: string[] = [];
      const zones: string[] = [];
      const signals: string[] = [];

      for (const day of recentHistory) {
        const sectorData = day.sectors.find(s => s.etf_ticker === sector.etf_ticker);
        if (sectorData) {
          ranks.push(sectorData.rank);
          dates.push(day.date);
          zones.push(zoneConfig[sectorData.zone]?.label || sectorData.zone);
          signals.push(sectorData.signal.replace('_', ' '));
        }
      }

      if (ranks.length >= 2) {
        map.set(sector.etf_ticker, { ranks, dates, zones, signals });
      }
    }

    return map;
  }, [history, sectors]);

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
            <table className="w-full text-sm table-fixed">
              <colgroup><col style={{ width: '15.5%' }} /><col style={{ width: '5%' }} /><col style={{ width: '20%' }} /><col style={{ width: '8%' }} /><col style={{ width: '17.5%' }} /><col style={{ width: '34%' }} /></colgroup>
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b border-border">
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">#</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">ETF</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Sector</th>
                  <th className="text-right py-2 pr-3 font-medium text-muted-foreground border-r border-border/50">Zone</th>
                  <th className="text-left py-2 pl-3 font-medium text-muted-foreground">Signal</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-3">
                      <span>Strength</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-normal">
                        <span className="w-3 h-2 rounded bg-green-500"></span>
                        <span>20d</span>
                        <span className="w-2 h-2 rounded-full bg-orange-500 ml-1"></span>
                        <span>5d</span>
                      </span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((sector) => {
                  const zone = zoneConfig[sector.zone];
                  const signal = signalConfig[sector.signal];
                  const rankHistory = rankHistoryMap.get(sector.etf_ticker);

                  return (
                    <tr
                      key={sector.etf_ticker}
                      onClick={() => handleRowClick(sector.sector_name)}
                      className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="py-1.5 px-2 font-mono text-muted-foreground text-right">
                        <span className="inline-flex items-center justify-end">
                          <span className="w-5 text-right">{sector.rank}</span>
                          {rankHistory && (
                            <RankSparkline
                              ranks={rankHistory.ranks}
                              dates={rankHistory.dates}
                              zones={rankHistory.zones}
                              signals={rankHistory.signals}
                            />
                          )}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-muted-foreground font-mono text-xs">
                        {sector.etf_ticker}
                      </td>
                      <td className="py-1.5 px-2 font-medium text-sm">
                        {sector.sector_name}
                      </td>
                      <td className="py-1.5 pr-3 text-right border-r border-border/50">
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
                      <td className="py-1.5 pl-3">
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
                      <td className="py-1.5 px-2">
                        <InlineStrengthBar mrs20={sector.mrs_20} mrs5={sector.mrs_5} />
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
