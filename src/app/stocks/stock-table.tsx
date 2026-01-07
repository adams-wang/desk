"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { ReportSheet } from "@/components/report-sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { StockDetail } from "@/lib/queries/stocks";

// Constants
const SECTORS = [
  "All Sectors",
  "Basic Materials",
  "Communication Services",
  "Consumer Cyclical",
  "Consumer Defensive",
  "Energy",
  "Financial Services",
  "Healthcare",
  "Industrials",
  "Real Estate",
  "Technology",
  "Utilities",
];

const VERDICTS = ["All", "BUY", "HOLD", "SELL", "AVOID"];

const THESIS = ["All", "STRENGTH", "VALUE", "PARABOLIC", "REVERSION", "NEUTRAL"];

// No special cases - all patterns looked up from dual_mrs_interpretation table

type SortField = "ticker" | "company" | "close" | "verdict_10" | "verdict_20" | "sector" | "sector_rank" | "beta_60" | "sharpe_20" | "dv_default";
type SortDirection = "asc" | "desc";

// Verdict sort order (for sorting)
const VERDICT_ORDER: Record<string, number> = {
  "BUY": 1,
  "STRONG BUY": 1,
  "HOLD": 2,
  "SELL": 3,
  "AVOID": 4,
};

// Volume regime helper
function getVolumeRegime(percentile: number | null): { regime: string; color: string } {
  if (percentile === null) return { regime: "-", color: "text-muted-foreground" };
  if (percentile < 25) return { regime: "LOW", color: "text-muted-foreground" };
  if (percentile < 75) return { regime: "NORMAL", color: "text-blue-500" };
  if (percentile < 90) return { regime: "HIGH", color: "text-amber-500" };
  return { regime: "EXTREME", color: "text-red-500" };
}

interface StockTableProps {
  stocks: StockDetail[];
  sectorRanks: Record<string, { rank: number; total: number }>;
}

// Verdict badge with upside indicator - outlined style consistent with individual stock page
// Upside indicator (V 20d only): GREEN dots for positive upside_60d_pct, RED dots for negative
// Thresholds: 0-10% = 1 dot, 10-20% = 2 dots, 20%+ = 3 dots
function VerdictBadge({
  verdict,
  upside,
}: {
  verdict: string | null;
  upside?: number | null;
}) {
  if (!verdict) return <span className="text-muted-foreground">-</span>;

  // Get color classes based on verdict - outlined style with dark mode support
  // BUY = green, SELL = red, AVOID/HOLD = gray
  const getVerdictClasses = (v: string): string => {
    const lower = v.toLowerCase();
    if (lower === "buy" || lower === "strong buy") {
      return "border-emerald-500/60 text-emerald-400 bg-emerald-500/20";
    }
    if (lower === "sell") {
      return "border-red-500/60 text-red-400 bg-red-500/20";
    }
    // AVOID, HOLD = gray
    return "border-muted-foreground/50 text-muted-foreground bg-muted/30";
  };

  // Upside dots based on upside_60d_pct thresholds
  const getUpsideDots = (u: number | null | undefined): [boolean, boolean, boolean] | null => {
    if (u === null || u === undefined) return null;
    const absValue = Math.abs(u);
    if (absValue >= 20) return [true, true, true];      // ●●● (high)
    if (absValue >= 10) return [false, true, true];     // ○●● (medium)
    return [false, false, true];                         // ○○● (low)
  };

  const dots = getUpsideDots(upside);
  const dotColor = upside !== null && upside !== undefined && upside >= 0 ? "bg-emerald-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border",
        getVerdictClasses(verdict)
      )}>
        {verdict}
      </span>
      {dots && (
        <div className="flex flex-col gap-[2px]">
          {dots.map((filled, i) => (
            <span
              key={i}
              className={cn(
                "w-[5px] h-[5px] rounded-full",
                filled ? dotColor : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}


// Sortable header
function SortableHeader({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const isActive = currentSort === field;

  return (
    <TableHead
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors select-none text-sm font-medium",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      onClick={() => onSort(field)}
    >
      <div className={cn(
        "flex items-center gap-1",
        align === "right" && "justify-end",
        align === "center" && "justify-center"
      )}>
        {align === "right" && (
          <span className={cn("w-4", !isActive && "opacity-0")}>
            {isActive && (currentDirection === "asc" ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            ))}
          </span>
        )}
        {label}
        {align !== "right" && (isActive || align === "left") && (
          <span className={cn("w-4", !isActive && "opacity-0")}>
            {isActive && (currentDirection === "asc" ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            ))}
          </span>
        )}
      </div>
    </TableHead>
  );
}

const INITIAL_LOAD = 50; // Initial rows to render
const LOAD_MORE = 50; // Rows to add on each scroll

export function StockTable({ stocks, sectorRanks }: StockTableProps) {
  const searchParams = useSearchParams();
  const parentRef = useRef<HTMLDivElement>(null);
  const tableSeparatorRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Track separator position for filter bar alignment
  const [separatorLeft, setSeparatorLeft] = useState(0);

  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);

  // Read initial filter/sort values from URL params
  const initialV10 = searchParams.get("v10")?.toUpperCase() || "All";
  const initialV20 = searchParams.get("v20")?.toUpperCase() || "All";
  const initialSort = (searchParams.get("sort") as SortField) || "dv_default";
  const initialOrder = (searchParams.get("order") as SortDirection) || "desc";

  // Filter state (removed search - using header search instead)
  const [tickerFilter, setTickerFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All Sectors");
  const [verdict10Filter, setVerdict10Filter] = useState(initialV10);
  const [verdict20Filter, setVerdict20Filter] = useState(initialV20);
  const [thesisFilter, setThesisFilter] = useState("All");

  // Sort state - default to edge descending (highest win% first)
  const [sortField, setSortField] = useState<SortField>(initialSort);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialOrder);

  // Report sheet state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTicker, setReportTicker] = useState<string>("");
  const [reportDate, setReportDate] = useState<string | undefined>();
  const [reportVariant, setReportVariant] = useState<"10" | "20">("10");
  const [reportVerdict10, setReportVerdict10] = useState<string | null>(null);
  const [reportVerdict20, setReportVerdict20] = useState<string | null>(null);

  // Handle verdict badge click to open report
  const handleVerdictClick = useCallback((
    ticker: string,
    date: string,
    variant: "10" | "20",
    verdict10: string | null,
    verdict20: string | null
  ) => {
    setReportTicker(ticker);
    setReportDate(date);
    setReportVariant(variant);
    setReportVerdict10(verdict10);
    setReportVerdict20(verdict20);
    setReportOpen(true);
  }, []);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Calculate change from previous close
  const getChange = (stock: StockDetail) => {
    if (stock.prev_close && stock.close) {
      const change = stock.close - stock.prev_close;
      const changePct = (change / stock.prev_close) * 100;
      return { change, changePct };
    }
    return { change: 0, changePct: 0 };
  };

  // Use official sector rankings from sector ETF data (passed from server component)
  const { sectorRankings, totalSectors } = useMemo(() => {
    const rankings = new Map<string, number>();
    let total = 0;
    for (const [sector, data] of Object.entries(sectorRanks)) {
      rankings.set(sector, data.rank);
      total = data.total; // All entries have same total
    }
    return { sectorRankings: rankings, totalSectors: total || 11 };
  }, [sectorRanks]);

  // Filter and sort stocks
  const filteredStocks = useMemo(() => {
    let result = stocks.filter(stock => {
      // Ticker filter
      if (tickerFilter && !stock.ticker.toUpperCase().includes(tickerFilter.toUpperCase())) {
        return false;
      }

      // Sector filter
      if (sectorFilter !== "All Sectors" && stock.sector !== sectorFilter) {
        return false;
      }

      // Verdict 10 filter
      if (verdict10Filter !== "All" && stock.verdict_10?.toUpperCase() !== verdict10Filter) {
        return false;
      }

      // Verdict 20 filter
      if (verdict20Filter !== "All" && stock.verdict_20?.toUpperCase() !== verdict20Filter) {
        return false;
      }

      // Thesis filter (using 20d thesis)
      if (thesisFilter !== "All" && stock.thesis_20?.toUpperCase() !== thesisFilter) {
        return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sortField) {
        case "ticker":
          aVal = a.ticker;
          bVal = b.ticker;
          break;
        case "company":
          aVal = a.company_name ?? "";
          bVal = b.company_name ?? "";
          break;
        case "close":
          // Sort by percent change, not absolute price
          const aChangePct = a.prev_close && a.close ? ((a.close - a.prev_close) / a.prev_close) * 100 : 0;
          const bChangePct = b.prev_close && b.close ? ((b.close - b.prev_close) / b.prev_close) * 100 : 0;
          aVal = aChangePct;
          bVal = bChangePct;
          break;
        case "verdict_10":
          aVal = VERDICT_ORDER[a.verdict_10?.toUpperCase() ?? ""] ?? 99;
          bVal = VERDICT_ORDER[b.verdict_10?.toUpperCase() ?? ""] ?? 99;
          break;
        case "verdict_20":
          aVal = VERDICT_ORDER[a.verdict_20?.toUpperCase() ?? ""] ?? 99;
          bVal = VERDICT_ORDER[b.verdict_20?.toUpperCase() ?? ""] ?? 99;
          break;
        case "sector":
          aVal = a.sector ?? "";
          bVal = b.sector ?? "";
          break;
        case "sector_rank":
          aVal = sectorRankings.get(a.sector ?? "Unknown") ?? 999;
          bVal = sectorRankings.get(b.sector ?? "Unknown") ?? 999;
          break;
        case "beta_60":
          aVal = a.beta_60 ?? 999;
          bVal = b.beta_60 ?? 999;
          break;
        case "sharpe_20":
          aVal = a.sharpe_ratio_20 ?? -999;
          bVal = b.sharpe_ratio_20 ?? -999;
          break;
        case "dv_default":
          // Sort: 1) DV exists by win_pct DESC, 2) V20=HOLD, 3) others - all by price change % DESC within group
          const aHasDV = a.dv_signal !== null;
          const bHasDV = b.dv_signal !== null;
          const aIsHold = !aHasDV && a.verdict_20?.toUpperCase() === "HOLD";
          const bIsHold = !bHasDV && b.verdict_20?.toUpperCase() === "HOLD";
          const aChangePctDV = a.prev_close && a.close ? ((a.close - a.prev_close) / a.prev_close) * 100 : 0;
          const bChangePctDV = b.prev_close && b.close ? ((b.close - b.prev_close) / b.prev_close) * 100 : 0;

          // Priority: DV (2) > HOLD (1) > Others (0) - higher is better (for DESC sort)
          const aPriority = aHasDV ? 2 : aIsHold ? 1 : 0;
          const bPriority = bHasDV ? 2 : bIsHold ? 1 : 0;

          if (aPriority !== bPriority) {
            // Different priority groups - higher priority value comes first (DESC)
            aVal = aPriority;
            bVal = bPriority;
          } else if (aHasDV && bHasDV) {
            // Both have DV - sort by win_pct DESC, then price change % DESC
            const aWin = a.dv_win_pct ?? 0;
            const bWin = b.dv_win_pct ?? 0;
            if (aWin !== bWin) {
              aVal = aWin;
              bVal = bWin;
            } else {
              aVal = aChangePctDV;
              bVal = bChangePctDV;
            }
          } else {
            // Same priority (both HOLD or both others) - sort by price change % DESC
            aVal = aChangePctDV;
            bVal = bChangePctDV;
          }
          break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [stocks, tickerFilter, sectorFilter, verdict10Filter, verdict20Filter, thesisFilter, sortField, sortDirection, sectorRankings]);

  // Count active filters
  const activeFilterCount = [
    tickerFilter !== "",
    sectorFilter !== "All Sectors",
    verdict10Filter !== "All",
    verdict20Filter !== "All",
    thesisFilter !== "All",
  ].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setTickerFilter("");
    setSectorFilter("All Sectors");
    setVerdict10Filter("All");
    setVerdict20Filter("All");
    setThesisFilter("All");
  };

  // Reset visible count when filters/sort change
  useEffect(() => {
    setVisibleCount(INITIAL_LOAD);
  }, [tickerFilter, sectorFilter, verdict10Filter, verdict20Filter, thesisFilter, sortField, sortDirection]);

  // Visible stocks (sliced for infinite scroll)
  const visibleStocks = useMemo(
    () => filteredStocks.slice(0, visibleCount),
    [filteredStocks, visibleCount]
  );

  // Infinite scroll: load more when near bottom
  useEffect(() => {
    const container = parentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 200;

      if (nearBottom && visibleCount < filteredStocks.length) {
        setVisibleCount(prev => Math.min(prev + LOAD_MORE, filteredStocks.length));
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [visibleCount, filteredStocks.length]);

  // Measure table separator position for filter bar alignment
  useEffect(() => {
    const updateSeparatorPosition = () => {
      if (tableSeparatorRef.current && filterBarRef.current) {
        const separatorRect = tableSeparatorRef.current.getBoundingClientRect();
        const filterBarRect = filterBarRef.current.getBoundingClientRect();
        setSeparatorLeft(separatorRect.left - filterBarRect.left);
      }
    };

    // Initial measurement after render
    const timer = setTimeout(updateSeparatorPosition, 100);
    window.addEventListener("resize", updateSeparatorPosition);

    // Use ResizeObserver to detect table layout changes
    const observer = new ResizeObserver(updateSeparatorPosition);
    if (parentRef.current) {
      observer.observe(parentRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateSeparatorPosition);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Filter Bar */}
      <div ref={filterBarRef} className="relative flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
        {/* Ticker Filter */}
        <input
          type="text"
          value={tickerFilter}
          onChange={(e) => setTickerFilter(e.target.value)}
          placeholder="Ticker..."
          className="h-9 w-24 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />

        {/* Stock count - absolutely positioned in the space before separator */}
        <span
          className="absolute text-sm text-muted-foreground text-right"
          style={{ left: 140, right: separatorLeft > 0 ? `calc(100% - ${separatorLeft - 16}px)` : '50%' }}
        >
          {visibleStocks.length} of {filteredStocks.length} stocks
          {visibleCount < filteredStocks.length && " (scroll for more)"}
        </span>

        {/* Separator aligned with table */}
        {separatorLeft > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-6 w-px bg-border"
            style={{ left: separatorLeft }}
          />
        )}

        {/* Spacer to push filters to align after separator */}
        <div className="shrink-0" style={{ width: Math.max(0, separatorLeft - 120) }} />

        {/* Sector Filter */}
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SECTORS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* V 10d Filter */}
        <select
          value={verdict10Filter}
          onChange={(e) => setVerdict10Filter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {VERDICTS.map(v => (
            <option key={v} value={v}>V 10d: {v}</option>
          ))}
        </select>

        {/* V 20d Filter */}
        <select
          value={verdict20Filter}
          onChange={(e) => setVerdict20Filter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {VERDICTS.map(v => (
            <option key={v} value={v}>V 20d: {v}</option>
          ))}
        </select>

        {/* Thesis Filter */}
        <select
          value={thesisFilter}
          onChange={(e) => setThesisFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {THESIS.map(t => (
            <option key={t} value={t}>Thesis: {t}</option>
          ))}
        </select>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 h-9 px-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            Clear ({activeFilterCount})
          </button>
        )}

      </div>

      {/* Table with virtual scrolling */}
      <div className="rounded-md border">
        <div
          ref={parentRef}
          className="max-h-[calc(100vh-280px)] overflow-auto"
        >
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
              <SortableHeader
                label="Ticker"
                field="ticker"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Company"
                field="company"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Price"
                field="close"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <TableHead className="text-center">
                <div className="flex flex-col items-center leading-tight">
                  <span>Vol</span>
                  <span className="text-[9px] text-muted-foreground/60">10d</span>
                </div>
              </TableHead>
              <TableHead className="w-8 px-0 align-middle">
                <div ref={tableSeparatorRef} className="h-4 w-px bg-border mx-auto" />
              </TableHead>
              <SortableHeader
                label="#"
                field="sector_rank"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                align="center"
              />
              <SortableHeader
                label="Sector"
                field="sector"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <TableHead className="text-center text-[9px] text-muted-foreground px-1 align-middle">P/G</TableHead>
              <TableHead className="text-center text-[9px] text-muted-foreground px-1 align-middle">DV</TableHead>
              <SortableHeader
                label="V 10d"
                field="verdict_10"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <TableHead className="w-px px-0">
                <div className="h-6 w-px bg-border mx-auto" />
              </TableHead>
              <SortableHeader
                label="V 20d"
                field="verdict_20"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                align="left"
              />
              <TableHead className="text-left text-[9px] text-muted-foreground px-0 w-6 align-middle">3d</TableHead>
              <TableHead className="text-center text-[9px] text-muted-foreground px-0 w-4 align-middle">T</TableHead>
              <TableHead className="w-px px-0">
                <div className="h-6 w-px bg-border mx-auto" />
              </TableHead>
              <TableHead className="text-sm font-medium text-center px-1">RSI 14</TableHead>
              <TableHead className="text-sm font-medium text-center px-1">MACD</TableHead>
              <SortableHeader
                label="Sharpe 20d"
                field="sharpe_20"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                align="center"
              />
              <SortableHeader
                label="Beta 60d"
                field="beta_60"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                align="center"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleStocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={20} className="h-24 text-center text-muted-foreground">
                  No stocks match your filters
                </TableCell>
              </TableRow>
            ) : (
              visibleStocks.map((stock) => {
                const { change, changePct } = getChange(stock);
                const volRegime = getVolumeRegime(stock.volume_10_ts);
                const isPositive = change >= 0;
                return (
                  <TableRow key={stock.ticker} className="hover:bg-muted/50 cursor-pointer">
                    <TableCell className="text-muted-foreground text-sm w-[30px]">
                      {stock.ticker}
                    </TableCell>
                    <TableCell className="text-foreground text-sm font-medium !whitespace-normal w-[150px] text-left px-0">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/stocks/${stock.ticker}`}
                              target="_blank"
                              className="hover:text-primary hover:underline cursor-pointer"
                            >
                              {stock.company_name ?? "-"}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" className="bg-card/75 backdrop-blur-md border border-border rounded-lg p-3 shadow-xl text-sm min-w-[275px]">
                            {/* Header with date and sector */}
                            <div className="flex items-start justify-between">
                              <span className="font-semibold text-foreground">{stock.date}</span>
                              <div className="flex flex-col items-end gap-0 text-xs font-mono">
                                <span>
                                  <span className="text-muted-foreground">Sector:</span>{" "}
                                  <span className="text-foreground">#{sectorRankings.get(stock.sector ?? "Unknown") ?? 0}/{totalSectors}</span>
                                </span>
                              </div>
                            </div>

                            {/* Price info */}
                            <div className="space-y-1 text-xs">
                              <p>
                                <span className="text-muted-foreground">Close:</span>{" "}
                                <span className="text-foreground font-mono font-bold">${stock.close?.toFixed(2)}</span>
                                <span className={cn("ml-2 font-mono", change >= 0 ? "text-green-500" : "text-red-500")}>
                                  {change >= 0 ? "+" : ""}{change.toFixed(2)} ({change >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
                                </span>
                              </p>
                              <p>
                                <span className="text-muted-foreground">Volume:</span>{" "}
                                <span className="text-foreground font-mono">{(stock.volume / 1e6).toFixed(2)}M</span>
                                {stock.volume_10_ts !== null && (
                                  <span className="text-muted-foreground ml-1">({stock.volume_10_ts.toFixed(0)}%ile)</span>
                                )}
                              </p>
                              {stock.rsi_14 !== null && (
                                <p className="font-mono">
                                  <span className="text-muted-foreground">RSI:</span>{" "}
                                  <span className="text-foreground">{stock.rsi_14.toFixed(0)}</span>{" "}
                                  <span className={stock.rsi_14 > 70 ? "text-red-500" : stock.rsi_14 < 30 ? "text-emerald-500" : "text-muted-foreground"}>
                                    ({stock.rsi_14 > 70 ? "Overbought" : stock.rsi_14 < 30 ? "Oversold" : "Neutral"})
                                  </span>
                                </p>
                              )}
                              {stock.macd !== null && stock.macd_signal !== null && (
                                <p className="font-mono">
                                  <span className="text-muted-foreground">MACD:</span>{" "}
                                  <span className="text-foreground">{stock.macd.toFixed(2)} vs {stock.macd_signal.toFixed(2)}</span>{" "}
                                  <span className={stock.macd > stock.macd_signal ? "text-green-500" : "text-red-500"}>
                                    ({stock.macd > stock.macd_signal ? "bullish" : "bearish"})
                                  </span>
                                </p>
                              )}
                              {/* Pattern signal */}
                              {stock.pattern && stock.pattern_conclusion && (
                                <div>
                                  <p>
                                    <span className="text-purple-500 font-mono font-bold">{stock.pattern}</span>
                                    <span className="text-foreground">: {stock.pattern_conclusion}</span>
                                  </p>
                                  {stock.pattern_interpretation && (
                                    <p className="text-foreground">{stock.pattern_interpretation}</p>
                                  )}
                                </div>
                              )}
                              {/* Gap signal */}
                              {stock.gap_type && (
                                <div>
                                  <p>
                                    <span className={stock.gap_conclusion === "PREFER" ? "text-green-500" : stock.gap_conclusion === "AVOID" ? "text-red-500" : "text-blue-500"}>
                                      Gap {stock.gap_type.includes("up") ? "↑" : "↓"}
                                    </span>
                                    {stock.gap_conclusion && (
                                      <span className="text-foreground font-bold">: {stock.gap_conclusion}</span>
                                    )}
                                  </p>
                                  {stock.gap_interpretation && (
                                    <p className="text-foreground text-xs max-w-[280px] leading-relaxed">{stock.gap_interpretation}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end leading-tight">
                        <span className="font-mono tabular-nums font-medium">
                          ${stock.close?.toFixed(2) ?? "-"}
                        </span>
                        <span className={cn(
                          "text-xs font-mono tabular-nums",
                          isPositive ? "text-emerald-500" : "text-red-500"
                        )}>
                          {isPositive ? "+" : ""}{change.toFixed(2)} ({isPositive ? "+" : ""}{changePct.toFixed(2)}%)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center px-1">
                      <div className="flex flex-col items-center leading-tight">
                        <span className={cn("text-xs font-medium", volRegime.color)}>{volRegime.regime}</span>
                        {stock.volume_10_ts !== null && (
                          <span className="text-[10px] text-muted-foreground">({stock.volume_10_ts.toFixed(0)}%)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="w-8 px-0 align-middle">
                      <div className="h-4 w-px bg-border mx-auto" />
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground font-mono">
                      {sectorRankings.get(stock.sector ?? "Unknown") ?? 0}/{totalSectors}
                    </TableCell>
                    <TableCell className="text-xs px-1 !whitespace-normal w-[70px]">
                      {stock.sector ?? "-"}
                    </TableCell>
                    <TableCell className="text-center px-1">
                      <div className="flex items-center justify-center gap-0.5">
                        {/* Gap badge - no tooltip, info shown on Company hover */}
                        {stock.gap_conclusion && (
                          <span className={cn(
                            "inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded",
                            stock.gap_conclusion === "PREFER" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          )}>
                            {stock.gap_type?.includes("up") ? "↑" : "↓"}
                          </span>
                        )}
                        {/* Pattern badge - no tooltip, info shown on Company hover */}
                        {stock.pattern_conclusion && (
                          <span className={cn(
                            "inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded",
                            stock.pattern_conclusion === "PREFER" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          )}>
                            {stock.pattern_conclusion === "PREFER" ? "P" : "A"}
                          </span>
                        )}
                        {/* No signal */}
                        {!stock.gap_conclusion && !stock.pattern_conclusion && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    {/* Dual Verdict Column */}
                    <TableCell className="text-center px-1">
                      {stock.dv_signal ? (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center gap-0.5 cursor-help">
                                <span className={cn(
                                  "inline-flex items-center px-1 py-0.5 text-[9px] font-semibold rounded border",
                                  stock.dv_signal === "PREFER"
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                    : "bg-red-50 text-red-500 border-red-200"
                                )}>
                                  {stock.dv_signal === "PREFER" ? "P" : "A"}
                                </span>
                                <span className="text-[8px] font-mono text-muted-foreground">
                                  {stock.dv_win_pct?.toFixed(0)}%
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" align="start" className="bg-card/75 backdrop-blur-md border border-border rounded-lg p-3 shadow-xl text-sm max-w-[350px]">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "font-semibold",
                                    stock.dv_signal === "PREFER" ? "text-emerald-600" : "text-red-500"
                                  )}>
                                    {stock.dv_signal}
                                  </span>
                                  <span className="text-muted-foreground">|</span>
                                  <span className="font-mono text-xs">
                                    Win: {stock.dv_win_pct?.toFixed(1)}% · Return: {stock.dv_ret_pct && stock.dv_ret_pct >= 0 ? "+" : ""}{stock.dv_ret_pct?.toFixed(2)}%
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground leading-relaxed">
                                  {stock.dv_interpretation}
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground/70 pt-1 border-t border-border">
                                  V 10d: {stock.verdict_10 ?? '-'} | V 20d: {stock.verdict_20 ?? '-'}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pl-1">
                      <button
                        className="flex justify-end w-full cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleVerdictClick(stock.ticker, stock.date, "10", stock.verdict_10, stock.verdict_20)}
                        disabled={!stock.verdict_10}
                      >
                        <VerdictBadge verdict={stock.verdict_10} />
                      </button>
                    </TableCell>
                    <TableCell className="w-px px-0 align-middle">
                      <div className="h-4 w-px bg-border mx-auto" />
                    </TableCell>
                    <TableCell>
                      <button
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleVerdictClick(stock.ticker, stock.date, "20", stock.verdict_10, stock.verdict_20)}
                        disabled={!stock.verdict_20}
                      >
                        <VerdictBadge verdict={stock.verdict_20} upside={stock.upside_60d_pct_20} />
                      </button>
                    </TableCell>
                    <TableCell className="text-left font-mono text-xs px-0 w-6">
                      {[stock.verdict_20_t2, stock.verdict_20_t1, stock.verdict_20].map((v, i) => {
                        const upper = v?.toUpperCase();
                        const isBuy = upper === "BUY";
                        const isSell = upper === "SELL";
                        // BUY = green, SELL = red, AVOID/HOLD = gray
                        const colorClass = isBuy ? "text-emerald-500" : isSell ? "text-red-500" : "text-muted-foreground";
                        return (
                          <span key={i} className={colorClass}>
                            {isBuy ? "+" : "-"}
                          </span>
                        );
                      })}
                    </TableCell>
                    <TableCell className="text-center text-[10px] font-medium px-0 w-4">
                      {stock.thesis_20 ? stock.thesis_20.charAt(0) : "-"}
                    </TableCell>
                    <TableCell className="w-px px-0 align-middle">
                      <div className="h-4 w-px bg-border mx-auto" />
                    </TableCell>
                    <TableCell className="text-center text-xs px-1">
                      {stock.rsi_14 !== null ? (
                        <div className="flex flex-col items-center leading-tight">
                          <span className="font-mono font-medium">{stock.rsi_14.toFixed(0)}</span>
                          <span className={cn(
                            "text-[10px]",
                            stock.rsi_14 >= 70 ? "text-red-500" :
                            stock.rsi_14 <= 30 ? "text-emerald-500" : "text-muted-foreground"
                          )}>
                            {stock.rsi_14 >= 70 ? "Overbought" : stock.rsi_14 <= 30 ? "Oversold" : "Neutral"}
                          </span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className={cn(
                      "text-center text-xs px-1",
                      stock.macd !== null && stock.macd_signal !== null && stock.macd > stock.macd_signal ? "text-emerald-500" :
                      stock.macd !== null && stock.macd_signal !== null && stock.macd < stock.macd_signal ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {stock.macd !== null && stock.macd_signal !== null ? (
                        stock.macd > stock.macd_signal ? "↑" : stock.macd < stock.macd_signal ? "↓" : "→"
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-center px-1">
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-xs font-mono font-medium">{stock.sharpe_ratio_20?.toFixed(2) ?? "-"}</span>
                        {stock.sharpe_ratio_20 != null && (
                          <span className={cn(
                            "text-[10px]",
                            stock.sharpe_ratio_20 > 2 ? "text-emerald-500" :
                            stock.sharpe_ratio_20 > 1 ? "text-emerald-400" :
                            stock.sharpe_ratio_20 > 0.5 ? "text-muted-foreground" :
                            stock.sharpe_ratio_20 > 0 ? "text-amber-500" : "text-red-500"
                          )}>
                            {stock.sharpe_ratio_20 > 2 ? "Excellent" :
                             stock.sharpe_ratio_20 > 1 ? "Good" :
                             stock.sharpe_ratio_20 > 0.5 ? "Moderate" :
                             stock.sharpe_ratio_20 > 0 ? "Poor" : "Losing"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center px-1">
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-xs font-mono font-medium">{stock.beta_60?.toFixed(2) ?? "-"}</span>
                        {stock.beta_60 != null && (
                          <span className={cn(
                            "text-[10px]",
                            stock.beta_60 > 1.2 ? "text-red-500" :
                            stock.beta_60 < 0.8 ? "text-emerald-500" : "text-muted-foreground"
                          )}>
                            {stock.beta_60 > 1.2 ? "Aggressive" :
                             stock.beta_60 < 0.8 ? "Defensive" : "Average"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      {/* Report Sheet */}
      <ReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        ticker={reportTicker}
        date={reportDate}
        initialVariant={reportVariant}
        verdict10={reportVerdict10}
        verdict20={reportVerdict20}
      />
    </div>
  );
}
