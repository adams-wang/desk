"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface L3Contract {
  verdict: string;
  conviction: string;
  conviction_score: number;
  entry_price: number;
  stop_loss: number;
  stop_loss_pct: number;
  target_price: number;
  risk_reward: number;
  shares: number;
  position_value: number;
}

interface ATRFallback {
  close: number;
  atr_14: number;
}

interface TradeSetupCardProps {
  l3_10: L3Contract | null;
  l3_20: L3Contract | null;
  fallback?: ATRFallback | null;
  ticker?: string;
  date?: string;
}

export function TradeSetupCard({ l3_10, l3_20, fallback, ticker, date }: TradeSetupCardProps) {
  const [activeVariant, setActiveVariant] = useState<"10d" | "20d">("10d");

  const contract = activeVariant === "10d" ? l3_10 : l3_20;
  const hasL3 = l3_10 || l3_20;

  // ATR-based simple setup (1.5x ATR stop, 2x ATR target = 1.33 R/R)
  const atrSetup = fallback && fallback.atr_14 > 0 ? {
    entry: fallback.close,
    stop: fallback.close - (1.5 * fallback.atr_14),
    target: fallback.close + (2 * fallback.atr_14),
    stopPct: (1.5 * fallback.atr_14 / fallback.close) * 100,
    targetPct: (2 * fallback.atr_14 / fallback.close) * 100,
    riskReward: 2 / 1.5, // 1.33
    atr: fallback.atr_14,
  } : null;

  if (!hasL3 && !atrSetup) {
    return null;
  }

  // Calculate target upside
  const targetUpside = contract
    ? ((contract.target_price - contract.entry_price) / contract.entry_price) * 100
    : 0;

  // Conviction color
  const getConvictionColor = (conviction: string) => {
    switch (conviction) {
      case "HIGH":
        return "text-emerald-500";
      case "MEDIUM":
        return "text-yellow-500";
      case "LOW":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  // Show ATR fallback when no L3 data
  if (!hasL3 && atrSetup) {
    return (
      <Card className="gap-4 py-5">
        <CardHeader>
          <div className="flex items-center justify-between -mt-1 h-6">
            <CardTitle>Trade Setup</CardTitle>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              ATR-based
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {/* Entry */}
            <div className="flex items-center" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">Entry</span>
              <span className="font-mono tabular-nums font-medium">
                ${atrSetup.entry.toFixed(2)}
              </span>
            </div>

            {/* Target */}
            <div className="flex items-center" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">Target</span>
              <span className="font-mono tabular-nums text-emerald-500">
                ${atrSetup.target.toFixed(2)}{" "}
                <span className="text-xs">
                  (+{atrSetup.targetPct.toFixed(1)}%)
                </span>
              </span>
            </div>

            {/* Stop */}
            <div className="flex items-center" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">Stop</span>
              <span className="font-mono tabular-nums text-red-500">
                ${atrSetup.stop.toFixed(2)}
              </span>
            </div>

            {/* R/R */}
            <div className="flex items-center" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">R/R</span>
              <span className="font-mono tabular-nums font-medium text-yellow-500">
                {atrSetup.riskReward.toFixed(2)}
              </span>
            </div>

            {/* Risk % */}
            <div className="flex items-center" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">Risk</span>
              <span className="font-mono tabular-nums text-red-500">
                -{atrSetup.stopPct.toFixed(1)}%
              </span>
            </div>

            {/* ATR */}
            <div className="flex items-center" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">ATR</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                ${atrSetup.atr.toFixed(2)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 pt-2 border-t">
            Simple setup: 1.5x ATR stop, 2x ATR target
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-4 py-5">
      <CardHeader>
        <div className="flex items-center justify-between -mt-1 h-6">
          <CardTitle>Trade Setup</CardTitle>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveVariant("10d")}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                activeVariant === "10d"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              disabled={!l3_10}
            >
              10d
            </button>
            <button
              onClick={() => setActiveVariant("20d")}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                activeVariant === "20d"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              disabled={!l3_20}
            >
              20d
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {contract ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {/* Entry */}
            <div className="flex items-center" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">Entry</span>
              <span className="font-mono tabular-nums font-medium">
                ${contract.entry_price.toFixed(2)}
              </span>
            </div>

            {/* Target */}
            <div className="flex items-center" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">Target</span>
              <span className="font-mono tabular-nums text-emerald-500">
                ${contract.target_price.toFixed(2)}{" "}
                <span className="text-xs">
                  (+{targetUpside.toFixed(1)}%)
                </span>
              </span>
            </div>

            {/* Stop */}
            <div className="flex items-center" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">Stop</span>
              <span className="font-mono tabular-nums text-red-500">
                ${contract.stop_loss.toFixed(2)}
              </span>
            </div>

            {/* R/R */}
            <div className="flex items-center" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">R/R</span>
              <span
                className={cn(
                  "font-mono tabular-nums font-medium",
                  contract.risk_reward >= 2
                    ? "text-emerald-500"
                    : contract.risk_reward >= 1.5
                    ? "text-yellow-500"
                    : "text-red-500"
                )}
              >
                {contract.risk_reward.toFixed(2)}
              </span>
            </div>

            {/* Risk % */}
            <div className="flex items-center" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">Risk</span>
              <span className="font-mono tabular-nums text-red-500">
                -{contract.stop_loss_pct.toFixed(1)}%
              </span>
            </div>

            {/* Conviction */}
            <div className="flex items-center" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">Conv</span>
              <span
                className={cn(
                  "font-mono tabular-nums",
                  getConvictionColor(contract.conviction)
                )}
              >
                {contract.conviction_score.toFixed(0)}{" "}
                <span className="text-xs">({contract.conviction})</span>
              </span>
            </div>

            {/* Size */}
            <div className="flex items-center col-span-2 pt-2 border-t mt-1" style={{ gap: "70px" }}>
              <span className="text-sm text-muted-foreground w-12">Size</span>
              <span className="font-mono tabular-nums">
                {contract.shares} shares{" "}
                <span className="text-muted-foreground">
                  (${contract.position_value.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                </span>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No trade setup available for {activeVariant}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
