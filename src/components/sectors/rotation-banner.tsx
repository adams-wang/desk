"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { RotationBias, CyclePhase } from "@/lib/queries/sectors";

interface RotationBannerProps {
  rotationBias: RotationBias;
  cyclePhase: CyclePhase;
  tradingDate: string;
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

export function RotationBanner({
  rotationBias,
  cyclePhase,
  tradingDate,
}: RotationBannerProps) {
  const bias = biasConfig[rotationBias];
  const cycle = cycleConfig[cyclePhase];
  const BiasIcon = bias.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 md:p-6",
        bias.bg,
        bias.border
      )}
    >
      <div className="flex flex-wrap items-center gap-4 md:gap-8">
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

        {/* Divider */}
        <div className="hidden h-12 w-px bg-border md:block" />

        {/* Date */}
        <div className="flex flex-col items-center gap-1 min-w-[100px]">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            As of
          </span>
          <span className="text-lg font-mono font-semibold">
            {tradingDate}
          </span>
        </div>
      </div>
    </div>
  );
}
