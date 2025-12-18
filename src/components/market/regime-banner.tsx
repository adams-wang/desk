"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Regime = "RISK_ON" | "NORMAL" | "RISK_OFF" | "CRISIS";
type Transition = "IMPROVING" | "STABLE" | "DETERIORATING" | null;
type Confidence = "HIGH" | "MEDIUM" | "LOW";

interface RegimeBannerProps {
  regime: Regime;
  positionPct: number;
  transition: Transition;
  confidence: Confidence;
  tradingDate: string;
}

const regimeConfig: Record<
  Regime,
  { bg: string; border: string; label: string; positionLabel: string }
> = {
  RISK_ON: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "RISK ON",
    positionLabel: "Aggressive",
  },
  NORMAL: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "NORMAL",
    positionLabel: "Full",
  },
  RISK_OFF: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "RISK OFF",
    positionLabel: "Reduced",
  },
  CRISIS: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "CRISIS",
    positionLabel: "Blocked",
  },
};

const transitionConfig: Record<
  NonNullable<Transition>,
  { icon: typeof TrendingUp; color: string; label: string }
> = {
  IMPROVING: {
    icon: TrendingUp,
    color: "text-emerald-500",
    label: "Improving",
  },
  STABLE: {
    icon: Minus,
    color: "text-zinc-400",
    label: "Stable",
  },
  DETERIORATING: {
    icon: TrendingDown,
    color: "text-red-500",
    label: "Deteriorating",
  },
};

const confidenceColors: Record<Confidence, string> = {
  HIGH: "text-emerald-500",
  MEDIUM: "text-amber-500",
  LOW: "text-red-500",
};

export function RegimeBanner({
  regime,
  positionPct,
  transition,
  confidence,
  tradingDate,
}: RegimeBannerProps) {
  const config = regimeConfig[regime];
  const transConfig = transition ? transitionConfig[transition] : null;
  const TransitionIcon = transConfig?.icon || Minus;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 md:p-6",
        config.bg,
        config.border
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Regime + Position + Direction */}
        <div className="flex flex-wrap items-center gap-4 md:gap-8">
          {/* Regime */}
          <div className="flex flex-col items-center gap-1 min-w-[100px]">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Regime
            </span>
            <span className="text-2xl font-bold tracking-tight">
              {config.label}
            </span>
            <span className={cn("text-xs font-medium", confidenceColors[confidence])}>
              {confidence} confidence
            </span>
          </div>

          {/* Divider */}
          <div className="hidden h-12 w-px bg-border md:block" />

          {/* Position */}
          <div className="flex flex-col items-center gap-1 min-w-[100px]">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Position Cap
            </span>
            <span className="text-2xl font-bold tabular-nums">{positionPct}%</span>
            <span className="text-xs text-muted-foreground">
              {config.positionLabel}
            </span>
          </div>

          {/* Divider */}
          <div className="hidden h-12 w-px bg-border md:block" />

          {/* Direction */}
          <div className="flex flex-col items-center gap-1 min-w-[100px]">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Direction
            </span>
            <div className="flex items-center gap-2">
              <TransitionIcon
                className={cn("h-6 w-6", transConfig?.color || "text-zinc-400")}
              />
              <span className={cn("text-lg font-semibold", transConfig?.color)}>
                {transConfig?.label || "N/A"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{tradingDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
