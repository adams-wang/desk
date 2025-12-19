"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SectorWithSignal, Signal } from "@/lib/queries/sectors";

interface SignalSummaryCardsProps {
  sectors: SectorWithSignal[];
  bullishCount: number;
  bearishCount: number;
}

const BULLISH_SIGNALS: Signal[] = ['RECOVERY_STRONG', 'RECOVERY_EARLY', 'IGNITION', 'TREND', 'MOMENTUM'];
const BEARISH_SIGNALS: Signal[] = ['TOXIC', 'AVOID', 'WEAKENING'];

const signalLabels: Record<Signal, string> = {
  RECOVERY_STRONG: "Recovery Strong",
  RECOVERY_EARLY: "Recovery Early",
  TOXIC: "Toxic",
  IGNITION: "Ignition",
  AVOID: "Avoid",
  NEUTRAL: "Neutral",
  TREND: "Trend",
  MOMENTUM: "Momentum",
  WEAKENING: "Weakening",
};

export function SignalSummaryCards({ sectors, bullishCount, bearishCount }: SignalSummaryCardsProps) {
  const bullishSectors = sectors.filter(s => BULLISH_SIGNALS.includes(s.signal));
  const bearishSectors = sectors.filter(s => BEARISH_SIGNALS.includes(s.signal));
  const neutralCount = sectors.length - bullishCount - bearishCount;

  // Get unique signal types present
  const bullishSignalTypes = [...new Set(bullishSectors.map(s => s.signal))];
  const bearishSignalTypes = [...new Set(bearishSectors.map(s => s.signal))];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Bullish Signals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Bullish Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500 tabular-nums">
            {bullishCount}
          </div>
          {bullishSignalTypes.length > 0 && (
            <p className="text-xs text-emerald-500/80 mt-1">
              {bullishSignalTypes.map(s => signalLabels[s]).join(", ")}
            </p>
          )}
          {bullishSectors.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {bullishSectors.map(s => s.etf_ticker).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bearish Signals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Bearish Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500 tabular-nums">
            {bearishCount}
          </div>
          {bearishSignalTypes.length > 0 && (
            <p className="text-xs text-red-500/80 mt-1">
              {bearishSignalTypes.map(s => signalLabels[s]).join(", ")}
            </p>
          )}
          {bearishSectors.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {bearishSectors.map(s => s.etf_ticker).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Neutral */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Neutral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-zinc-400 tabular-nums">
            {neutralCount}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            No clear signal
          </p>
          {neutralCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {sectors.filter(s => s.signal === 'NEUTRAL').map(s => s.etf_ticker).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
