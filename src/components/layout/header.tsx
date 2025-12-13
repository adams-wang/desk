"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const [tradingDate, setTradingDate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trading-date")
      .then((res) => res.json())
      .then((data) => setTradingDate(data.date))
      .catch(console.error);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Quant Trading Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
        {tradingDate && (
          <Badge variant="outline" className="font-mono">
            {tradingDate}
          </Badge>
        )}
      </div>
    </header>
  );
}
