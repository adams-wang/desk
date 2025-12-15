"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

interface MarketData {
  date: string;
  vix: number | null;
  regime: "risk_on" | "normal" | "risk_off" | "crisis" | null;
}

const regimeConfig: Record<string, { label: string; color: string; bg: string }> = {
  risk_on: { label: "Risk On", color: "text-green-700 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  normal: { label: "Normal", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  risk_off: { label: "Risk Off", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  crisis: { label: "Crisis", color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
};

export function Header() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);

  useEffect(() => {
    fetch("/api/trading-date")
      .then((res) => res.json())
      .then((data) => setMarketData(data))
      .catch(console.error);
  }, []);

  const regime = marketData?.regime ? regimeConfig[marketData.regime] : null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Quant Trading Dashboard</h1>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {marketData?.vix !== null && marketData?.vix !== undefined && (
          <Badge variant="outline" className="font-mono text-xs gap-1">
            <span className="text-muted-foreground">VIX</span>
            <span className="font-bold">{marketData.vix.toFixed(1)}</span>
          </Badge>
        )}
        {regime && (
          <Badge className={`font-medium text-xs ${regime.color} ${regime.bg} border-0`}>
            {regime.label}
          </Badge>
        )}
        {marketData?.date && (
          <Badge variant="outline" className="font-mono">
            {marketData.date}
          </Badge>
        )}
      </div>
    </header>
  );
}
