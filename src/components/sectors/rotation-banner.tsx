"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RotationBias, CyclePhase, SectorWithSignal, Signal } from "@/lib/queries/sectors";

// 4 zones from left to right on chart
const TOXIC_AVOID_SIGNALS: Signal[] = ['TOXIC', 'AVOID'];
const IGNITION_SIGNALS: Signal[] = ['IGNITION'];
const RIGHT_SIGNALS: Signal[] = ['TREND', 'MOMENTUM', 'WEAKENING'];

const signalLabels: Record<Signal, string> = {
  RECOVERY_STRONG: "Recovery",
  RECOVERY_EARLY: "Recovery",
  TOXIC: "Toxic",
  IGNITION: "Ignition",
  AVOID: "Avoid",
  NEUTRAL: "Neutral",
  TREND: "Trend",
  MOMENTUM: "Momentum",
  WEAKENING: "Weakening",
};

interface RotationBannerProps {
  rotationBias: RotationBias;
  cyclePhase: CyclePhase;
  sectors: SectorWithSignal[];
}

const biasConfig: Record<RotationBias, {
  bg: string;
  border: string;
  label: string;
  description: string;
  icon: typeof TrendingUp;
  iconColor: string;
}> = {
  OFFENSIVE: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "OFFENSIVE",
    description: "Growth sectors leading",
    icon: TrendingUp,
    iconColor: "text-emerald-500",
  },
  NEUTRAL: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "NEUTRAL",
    description: "Mixed sector leadership",
    icon: Minus,
    iconColor: "text-blue-500",
  },
  DEFENSIVE: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "DEFENSIVE",
    description: "Safety sectors leading",
    icon: TrendingDown,
    iconColor: "text-amber-500",
  },
};

const cycleConfig: Record<CyclePhase, { label: string; description: string }> = {
  EARLY_EXPANSION: {
    label: "Early Expansion",
    description: "Financials & Cyclicals leading",
  },
  MID_EXPANSION: {
    label: "Mid Expansion",
    description: "Tech & Industrials leading",
  },
  LATE_EXPANSION: {
    label: "Late Expansion",
    description: "Energy & Materials leading",
  },
  CONTRACTION: {
    label: "Contraction",
    description: "Defensives leading",
  },
  NEUTRAL: {
    label: "Neutral",
    description: "No clear cycle signal",
  },
};

// Sector list with tooltip showing full names
function SectorList({ sectors }: { sectors: SectorWithSignal[] }) {
  if (sectors.length === 0) return <span className="text-[10px] text-muted-foreground">—</span>;

  // Sort alphabetically by sector name
  const sortedSectors = [...sectors].sort((a, b) => a.sector_name.localeCompare(b.sector_name));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-[10px] text-muted-foreground cursor-default truncate max-w-full">
          {sortedSectors.map(s => s.etf_ticker).join(", ")}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="flex flex-col gap-0.5">
          {sortedSectors.map(s => (
            <div key={s.etf_ticker}>
              {s.sector_name} <span className="text-muted-foreground">({s.etf_ticker})</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function RotationBanner({
  rotationBias,
  cyclePhase,
  sectors,
}: RotationBannerProps) {
  const bias = biasConfig[rotationBias];
  const cycle = cycleConfig[cyclePhase];
  const BiasIcon = bias.icon;

  // Group sectors by chart position (left to right: 4 zones)
  const toxicAvoidSectors = sectors.filter(s => TOXIC_AVOID_SIGNALS.includes(s.signal));
  const ignitionSectors = sectors.filter(s => IGNITION_SIGNALS.includes(s.signal));
  const neutralSectors = sectors.filter(s => s.signal === 'NEUTRAL');
  const rightSectors = sectors.filter(s => RIGHT_SIGNALS.includes(s.signal));


  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "rounded-lg border p-4 md:p-6",
          bias.bg,
          bias.border
        )}
      >
        {/* Content-driven Layout (2 items : 4 items = 1:2 ratio) */}
        <div className="grid gap-0" style={{ gridTemplateColumns: '33.3% 66.7%' }}>
        {/* Left Half - Rotation Bias & Cycle Phase */}
        <div className="flex items-center gap-4 md:gap-8 pr-6 border-r border-border">
          {/* Rotation Bias */}
          <div className="flex flex-col items-center gap-1 min-w-[120px]">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Rotation Bias
            </span>
            <div className="flex items-center gap-2">
              <BiasIcon className={cn("h-6 w-6", bias.iconColor)} />
              <span className="text-2xl font-bold tracking-tight">
                {bias.label}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {bias.description}
            </span>
          </div>

          {/* Divider */}
          <div className="hidden h-12 w-px bg-border md:block" />

          {/* Cycle Phase */}
          <div className="flex flex-col items-center gap-1 min-w-[120px]">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Cycle Phase
            </span>
            <span className="text-xl font-semibold">
              {cycle.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {cycle.description}
            </span>
          </div>
        </div>

        {/* Right Half - 4 Signal Zones (equal width grid) */}
        <div className="grid grid-cols-4 gap-4 pl-6">
          {/* Zone 1: Extreme, Avoid (Zone G + Zone C signals) */}
          <div className="flex flex-col gap-0.5 items-center text-center">
            <span className="text-xs font-medium text-red-500">Extreme, Avoid</span>
            <span className="text-2xl font-bold text-red-500 tabular-nums">
              {toxicAvoidSectors.length}
            </span>
            <SectorList sectors={toxicAvoidSectors} />
          </div>

          {/* Zone 2: Ignition */}
          <div className="flex flex-col gap-0.5 items-center text-center">
            <span className="text-xs font-medium text-amber-500">Ignition</span>
            <span className="text-2xl font-bold text-amber-500 tabular-nums">
              {ignitionSectors.length}
            </span>
            <SectorList sectors={ignitionSectors} />
          </div>

          {/* Zone 3: Neutral */}
          <div className="flex flex-col gap-0.5 items-center text-center">
            <span className="text-xs font-medium text-zinc-500">Neutral</span>
            <span className="text-2xl font-bold text-zinc-500 tabular-nums">
              {neutralSectors.length}
            </span>
            <SectorList sectors={neutralSectors} />
          </div>

          {/* Zone 4: Trend, Momentum, Weakening */}
          <div className="flex flex-col gap-0.5 items-center text-center">
            <span className="text-xs font-medium text-emerald-500">Trend, Momentum, Weakening</span>
            <span className="text-2xl font-bold text-emerald-500 tabular-nums">
              {rightSectors.length}
            </span>
            <SectorList sectors={rightSectors} />
          </div>
        </div>
      </div>
      </div>
    </TooltipProvider>
  );
}
