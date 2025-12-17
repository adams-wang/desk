"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { parseISO } from "date-fns";

interface MarketData {
  date: string;
  vix: number | null;
  regime: "risk_on" | "normal" | "risk_off" | "crisis" | null;
  latestDate: string;
  prevDate: string | null;
  nextDate: string | null;
}

const regimeConfig: Record<string, { label: string; color: string; bg: string }> = {
  risk_on: { label: "Risk On", color: "text-green-700 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  normal: { label: "Normal", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  risk_off: { label: "Risk Off", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  crisis: { label: "Crisis", color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
};

export function Header() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [tradingDates, setTradingDates] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentDate = searchParams.get("date");

  const fetchMarketData = useCallback((date?: string | null) => {
    const url = date ? `/api/trading-date?date=${date}` : "/api/trading-date";
    fetch(url)
      .then((res) => res.json())
      .then((data) => setMarketData(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchMarketData(currentDate);
  }, [currentDate, fetchMarketData]);

  // Fetch all trading dates for calendar
  useEffect(() => {
    fetch("/api/trading-dates")
      .then((res) => res.json())
      .then((data) => setTradingDates(data.dates || []))
      .catch(console.error);
  }, []);

  // Create a Set of valid trading dates for fast lookup
  const tradingDatesSet = useMemo(() => new Set(tradingDates), [tradingDates]);

  // Format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Disable dates that are not trading dates
  const isDateDisabled = useCallback(
    (date: Date) => {
      const dateStr = formatDateLocal(date);
      return !tradingDatesSet.has(dateStr);
    },
    [tradingDatesSet]
  );

  const navigateToDate = (date: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (date && date !== marketData?.latestDate) {
      params.set("date", date);
    } else {
      params.delete("date");
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const regime = marketData?.regime ? regimeConfig[marketData.regime] : null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-sm font-mono transition-colors hover:bg-muted"
                title="Click to select date"
              >
                <CalendarIcon className="size-3.5" />
                {marketData.date}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={parseISO(marketData.date)}
                onSelect={(date) => {
                  if (date) {
                    navigateToDate(formatDateLocal(date));
                    setCalendarOpen(false);
                  }
                }}
                disabled={isDateDisabled}
                defaultMonth={parseISO(marketData.date)}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  );
}
