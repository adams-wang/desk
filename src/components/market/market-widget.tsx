"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

type Regime = "RISK_ON" | "NORMAL" | "RISK_OFF" | "CRISIS";
type Transition = "IMPROVING" | "STABLE" | "DETERIORATING" | null;

interface MarketWidgetProps {
  regime: Regime;
  positionPct: number;
  transition: Transition;
  vixValue: number;
  vixBucket: string;
  tradingDate: string;
}

const regimeConfig: Record<Regime, { color: string; label: string }> = {
  RISK_ON: { color: "text-emerald-500", label: "Risk On" },
  NORMAL: { color: "text-blue-500", label: "Normal" },
  RISK_OFF: { color: "text-amber-500", label: "Risk Off" },
  CRISIS: { color: "text-red-500", label: "Crisis" },
};

const transitionConfig: Record<
  NonNullable<Transition>,
  { icon: typeof TrendingUp; color: string }
> = {
  IMPROVING: { icon: TrendingUp, color: "text-emerald-500" },
  STABLE: { icon: Minus, color: "text-zinc-400" },
  DETERIORATING: { icon: TrendingDown, color: "text-red-500" },
};

export function MarketWidget({
  regime,
  positionPct,
  transition,
  vixValue,
  vixBucket,
  tradingDate,
}: MarketWidgetProps) {
  const regConfig = regimeConfig[regime];
  const transConfig = transition ? transitionConfig[transition] : null;
  const TransitionIcon = transConfig?.icon || Minus;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="text-muted-foreground">Market Status</span>
          <span className="text-xs font-normal text-muted-foreground">
            {tradingDate}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Regime + Position */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TransitionIcon
              className={cn("h-5 w-5", transConfig?.color || "text-zinc-400")}
            />
            <span className={cn("text-xl font-bold", regConfig.color)}>
              {regConfig.label}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{positionPct}%</div>
            <div className="text-xs text-muted-foreground">Position Cap</div>
          </div>
        </div>

        {/* VIX */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">VIX</span>
          <span className="font-medium tabular-nums">
            {vixValue.toFixed(2)}{" "}
            <span className="text-muted-foreground">({vixBucket})</span>
          </span>
        </div>

        {/* Link to Market page */}
        <Link
          href="/market"
          className="flex items-center justify-center gap-2 rounded-lg border p-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          View Full Analysis
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
