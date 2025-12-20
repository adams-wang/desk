"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, X } from "lucide-react";
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
const CONVICTIONS = ["All", "HIGH", "MEDIUM", "LOW"];

type SortField = "ticker" | "company" | "close" | "verdict_10" | "verdict_20" | "sector" | "sector_rank";
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
  if (percentile < 90) return { regime: "HIGH", color: "text-orange-500" };
  return { regime: "EXTREME", color: "text-red-500" };
}

interface StockTableProps {
  stocks: StockDetail[];
  sectorRanks: Record<string, { rank: number; total: number }>;
}

// Verdict badge with conviction indicator - outlined style consistent with individual stock page
// order: "conviction-first" for V-10 (●●● SELL), "verdict-first" for V-20 (SELL ●●●)
function VerdictBadge({
  verdict,
  conviction,
  order = "verdict-first"
}: {
  verdict: string | null;
  conviction: string | null;
  order?: "conviction-first" | "verdict-first";
}) {
  if (!verdict) return <span className="text-muted-foreground">-</span>;

  // Get color classes based on verdict - outlined style
  // BUY = green, SELL = red, AVOID/HOLD = gray
  const getVerdictClasses = (v: string): string => {
    const lower = v.toLowerCase();
    if (lower === "buy" || lower === "strong buy") {
      return "border-emerald-500/50 text-emerald-600 bg-emerald-50/50";
    }
    if (lower === "sell") {
      return "border-red-400/50 text-red-500 bg-red-50/50";
    }
    // AVOID, HOLD = gray
    return "border-muted-foreground/50 text-muted-foreground bg-muted/30";
  };

  // Conviction dots
  const getConvictionDots = (c: string | null) => {
    if (!c) return null;
    const level = c.toUpperCase();
    if (level === "HIGH") return "●●●";
    if (level === "MEDIUM") return "●●○";
    if (level === "LOW") return "●○○";
    return null;
  };

  const dots = getConvictionDots(conviction);

  const verdictBadge = (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border",
      getVerdictClasses(verdict)
    )}>
      {verdict}
    </span>
  );

  const convictionDots = dots && (
    <span className={cn(
      "text-[10px]",
      conviction?.toUpperCase() === "HIGH" ? "text-emerald-500" :
      conviction?.toUpperCase() === "MEDIUM" ? "text-amber-500" : "text-muted-foreground"
    )}>
      {dots}
    </span>
  );

  return (
    <div className="flex items-center gap-1.5">
      {order === "conviction-first" ? (
        <>{convictionDots}{verdictBadge}</>
      ) : (
        <>{verdictBadge}{convictionDots}</>
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
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  align?: "left" | "right" | "center";
}) {
  const isActive = currentSort === field;

  return (
    <TableHead
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors select-none",
        align === "right" && "text-right",
        align === "center" && "text-center"
      )}
      onClick={() => onSort(field)}
    >
      <div className={cn(
        "flex items-center gap-1",
        align === "right" && "justify-end",
        align === "center" && "justify-center"
      )}>
        {label}
        <span className={cn("w-4", !isActive && "opacity-0")}>
          {isActive && (currentDirection === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          ))}
        </span>
      </div>
    </TableHead>
  );
}

export function StockTable({ stocks, sectorRanks }: StockTableProps) {
  // Filter state (removed search - using header search instead)
  const [sectorFilter, setSectorFilter] = useState("All Sectors");
  const [verdict10Filter, setVerdict10Filter] = useState("All");
  const [verdict20Filter, setVerdict20Filter] = useState("All");
  const [convictionFilter, setConvictionFilter] = useState("All");

  // Sort state - default to verdict_10 ascending (BUY first)
  const [sortField, setSortField] = useState<SortField>("verdict_10");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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

      // Conviction filter (check both)
      if (convictionFilter !== "All") {
        const conv10 = stock.conviction_10?.toUpperCase();
        const conv20 = stock.conviction_20?.toUpperCase();
        if (conv10 !== convictionFilter && conv20 !== convictionFilter) {
          return false;
        }
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
          aVal = a.close ?? 0;
          bVal = b.close ?? 0;
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
  }, [stocks, sectorFilter, verdict10Filter, verdict20Filter, convictionFilter, sortField, sortDirection, sectorRankings]);

  // Count active filters
  const activeFilterCount = [
    sectorFilter !== "All Sectors",
    verdict10Filter !== "All",
    verdict20Filter !== "All",
    convictionFilter !== "All",
  ].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setSectorFilter("All Sectors");
    setVerdict10Filter("All");
    setVerdict20Filter("All");
    setConvictionFilter("All");
  };

  // Signal counts
  const signalCounts = useMemo(() => {
    const buy10 = stocks.filter(s => s.verdict_10?.toUpperCase() === "BUY").length;
    const buy20 = stocks.filter(s => s.verdict_20?.toUpperCase() === "BUY").length;
    const aligned = stocks.filter(s =>
      s.verdict_10?.toUpperCase() === "BUY" &&
      s.verdict_20?.toUpperCase() === "BUY"
    ).length;
    return { buy10, buy20, aligned };
  }, [stocks]);

  return (
    <div className="space-y-4">
      {/* Signal Summary */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">L3-10 BUY:</span>
          <span className="font-semibold text-emerald-500">{signalCounts.buy10}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">L3-20 BUY:</span>
          <span className="font-semibold text-emerald-500">{signalCounts.buy20}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Aligned BUY:</span>
          <span className="font-semibold text-blue-500">{signalCounts.aligned}</span>
        </div>
      </div>

      {/* Filter Bar - removed search input (duplicate with header) */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
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

        {/* L3-10 Filter */}
        <select
          value={verdict10Filter}
          onChange={(e) => setVerdict10Filter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {VERDICTS.map(v => (
            <option key={v} value={v}>L3-10: {v}</option>
          ))}
        </select>

        {/* L3-20 Filter */}
        <select
          value={verdict20Filter}
          onChange={(e) => setVerdict20Filter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {VERDICTS.map(v => (
            <option key={v} value={v}>L3-20: {v}</option>
          ))}
        </select>

        {/* Conviction Filter */}
        <select
          value={convictionFilter}
          onChange={(e) => setConvictionFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {CONVICTIONS.map(c => (
            <option key={c} value={c}>Conv: {c}</option>
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

        {/* Results count */}
        <span className="ml-auto text-sm text-muted-foreground">
          {filteredStocks.length} of {stocks.length} stocks
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
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
                <div className="h-4 w-px bg-border mx-auto" />
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
              <TableHead className="text-center text-xs text-muted-foreground px-1">Sig</TableHead>
              <TableHead className="text-right text-xs text-muted-foreground px-0 w-10">
                <span className="text-[9px]">T-2 T-1 T</span>
              </TableHead>
              <SortableHeader
                label="Early"
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
                label="Confirm"
                field="verdict_20"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <TableHead className="text-xs text-muted-foreground text-center px-1">
                <div className="flex flex-col items-center leading-tight">
                  <span>RSI</span>
                  <span className="text-[9px] text-muted-foreground/60">14</span>
                </div>
              </TableHead>
              <TableHead className="text-xs text-muted-foreground text-center px-1">MACD</TableHead>
              <TableHead className="text-xs text-muted-foreground text-center px-1">
                <div className="flex flex-col items-center leading-tight">
                  <span>Sharpe</span>
                  <span className="text-[9px] text-muted-foreground/60">20d</span>
                </div>
              </TableHead>
              <TableHead className="text-xs text-muted-foreground text-center px-1">
                <div className="flex flex-col items-center leading-tight">
                  <span>Beta</span>
                  <span className="text-[9px] text-muted-foreground/60">60d</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="h-24 text-center text-muted-foreground">
                  No stocks match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredStocks.map((stock) => {
                const { change, changePct } = getChange(stock);
                const volRegime = getVolumeRegime(stock.volume_10_ts);
                const isPositive = change >= 0;
                return (
                  <TableRow key={stock.ticker} className="hover:bg-muted/50">
                    <TableCell>
                      <Link
                        href={`/stocks/${stock.ticker}`}
                        className="text-muted-foreground hover:text-primary hover:underline"
                      >
                        {stock.ticker}
                      </Link>
                    </TableCell>
                    <TableCell className="text-foreground text-sm font-medium !whitespace-normal w-[175px]">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">{stock.company_name ?? "-"}</span>
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" className="max-w-sm p-3 space-y-2">
                            {/* Header with date and sector */}
                            <div className="flex justify-between items-start border-b pb-2 mb-2">
                              <span className="font-bold">{stock.date}</span>
                              <div className="text-right text-xs text-muted-foreground">
                                Sector: #{sectorRankings.get(stock.sector ?? "Unknown") ?? 0}/{totalSectors}
                              </div>
                            </div>

                            {/* Price info */}
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Close:</span>
                                <span className="font-mono">
                                  <span className="font-medium">${stock.close?.toFixed(2)}</span>
                                  <span className={cn("ml-2", change >= 0 ? "text-emerald-500" : "text-red-500")}>
                                    {change >= 0 ? "+" : ""}{change.toFixed(2)} ({change >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
                                  </span>
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Volume:</span>
                                <span className="font-mono">
                                  {(stock.volume / 1e6).toFixed(2)}M ({stock.volume_10_ts?.toFixed(0)}%ile)
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">RSI:</span>
                                <span className="font-mono">
                                  {stock.rsi_14?.toFixed(0) ?? "-"}
                                  <span className={cn(
                                    "ml-1",
                                    stock.rsi_14 && stock.rsi_14 >= 70 ? "text-red-500" :
                                    stock.rsi_14 && stock.rsi_14 <= 30 ? "text-emerald-500" : "text-muted-foreground"
                                  )}>
                                    ({stock.rsi_14 ? (stock.rsi_14 >= 70 ? "Overbought" : stock.rsi_14 <= 30 ? "Oversold" : "Neutral") : "-"})
                                  </span>
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">MACD:</span>
                                <span className="font-mono">
                                  {stock.macd?.toFixed(2) ?? "-"} vs {stock.macd_signal?.toFixed(2) ?? "-"}
                                  {stock.macd !== null && stock.macd_signal !== null && (
                                    <span className={cn("ml-1", stock.macd > stock.macd_signal ? "text-emerald-500" : "text-red-500")}>
                                      ({stock.macd > stock.macd_signal ? "bullish" : "bearish"})
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Pattern signal */}
                            {stock.pattern_conclusion && (
                              <div className="pt-2 border-t space-y-0.5">
                                <div className={cn(
                                  "font-semibold",
                                  stock.pattern_conclusion === "PREFER" ? "text-emerald-600" : "text-red-500"
                                )}>
                                  {stock.pattern}: {stock.pattern_conclusion}
                                </div>
                                {stock.pattern_interpretation && (
                                  <div className="text-xs text-muted-foreground">
                                    {stock.pattern_interpretation}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Gap signal */}
                            {stock.gap_conclusion && (
                              <div className={cn("space-y-0.5", stock.pattern_conclusion ? "" : "pt-2 border-t")}>
                                <div className={cn(
                                  "font-semibold",
                                  stock.gap_conclusion === "PREFER" ? "text-emerald-600" : "text-red-500"
                                )}>
                                  Gap {stock.gap_type?.replace("_", " ")}: {stock.gap_conclusion}
                                </div>
                                {stock.gap_interpretation && (
                                  <div className="text-xs text-muted-foreground">
                                    {stock.gap_interpretation}
                                  </div>
                                )}
                              </div>
                            )}
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
                    <TableCell className="text-right font-mono text-xs px-0 w-10">
                      {[stock.verdict_10_t2, stock.verdict_10_t1, stock.verdict_10].map((v, i) => {
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
                    <TableCell className="text-right pl-1">
                      <button
                        className="flex justify-end w-full cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleVerdictClick(stock.ticker, stock.date, "10", stock.verdict_10, stock.verdict_20)}
                        disabled={!stock.verdict_10}
                      >
                        <VerdictBadge verdict={stock.verdict_10} conviction={stock.conviction_10} order="conviction-first" />
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
                        <VerdictBadge verdict={stock.verdict_20} conviction={stock.conviction_20} order="verdict-first" />
                      </button>
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
                            stock.sharpe_ratio_20 > 0 ? "text-orange-500" : "text-red-500"
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
