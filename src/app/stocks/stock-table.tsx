"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

type SortField = "ticker" | "close" | "change_pct" | "mrs_10" | "mrs_20" | "sector";
type SortDirection = "asc" | "desc";

interface StockTableProps {
  stocks: StockDetail[];
}

// Inline MRS bar component
function MRSBar({ value, maxValue = 5 }: { value: number | null; maxValue?: number }) {
  if (value === null) return <span className="text-muted-foreground">-</span>;

  const clampedValue = Math.max(-maxValue, Math.min(value, maxValue));
  const width = Math.abs(clampedValue) / maxValue * 40; // max 40px wide
  const isPositive = value >= 0;

  return (
    <div className="flex items-center gap-1 w-20">
      <div className="relative h-3 w-10 bg-muted/30 rounded-sm overflow-hidden">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
        {/* Bar */}
        <div
          className={cn(
            "absolute top-0.5 bottom-0.5 rounded-sm",
            isPositive ? "bg-emerald-500" : "bg-red-500"
          )}
          style={{
            left: isPositive ? "50%" : `${50 - (width / 40) * 50}%`,
            width: `${(width / 40) * 50}%`,
          }}
        />
      </div>
      <span className={cn(
        "text-xs font-mono tabular-nums",
        isPositive ? "text-emerald-500" : "text-red-500"
      )}>
        {value >= 0 ? "+" : ""}{value.toFixed(1)}%
      </span>
    </div>
  );
}

// Verdict badge with conviction indicator
function VerdictBadge({
  verdict,
  conviction
}: {
  verdict: string | null;
  conviction: string | null;
}) {
  if (!verdict) return <span className="text-muted-foreground">-</span>;

  const getVariant = (v: string): "default" | "secondary" | "destructive" | "outline" => {
    const lower = v.toLowerCase();
    if (lower === "buy" || lower === "strong buy") return "default";
    if (lower === "sell" || lower === "avoid") return "destructive";
    return "secondary";
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

  return (
    <div className="flex items-center gap-1">
      <Badge variant={getVariant(verdict)} className="text-xs">
        {verdict}
      </Badge>
      {dots && (
        <span className={cn(
          "text-[10px]",
          conviction?.toUpperCase() === "HIGH" ? "text-emerald-500" :
          conviction?.toUpperCase() === "MEDIUM" ? "text-amber-500" : "text-muted-foreground"
        )}>
          {dots}
        </span>
      )}
    </div>
  );
}

// Combined L3 cell
function L3Cell({
  mrs,
  verdict,
  conviction
}: {
  mrs: number | null;
  verdict: string | null;
  conviction: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <MRSBar value={mrs} />
      <VerdictBadge verdict={verdict} conviction={conviction} />
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

export function StockTable({ stocks }: StockTableProps) {
  // Filter state
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All Sectors");
  const [verdict10Filter, setVerdict10Filter] = useState("All");
  const [verdict20Filter, setVerdict20Filter] = useState("All");
  const [convictionFilter, setConvictionFilter] = useState("All");

  // Sort state
  const [sortField, setSortField] = useState<SortField>("mrs_20");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Calculate change percentage (mock - you may need to add prev_close to query)
  const getChangePct = (stock: StockDetail) => {
    // Using MRS_5 as a proxy for short-term change, or calculate from open
    if (stock.open && stock.close) {
      return ((stock.close - stock.open) / stock.open) * 100;
    }
    return 0;
  };

  // Filter and sort stocks
  const filteredStocks = useMemo(() => {
    let result = stocks.filter(stock => {
      // Search filter
      if (search && !stock.ticker.toLowerCase().includes(search.toLowerCase())) {
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
        case "close":
          aVal = a.close ?? 0;
          bVal = b.close ?? 0;
          break;
        case "change_pct":
          aVal = getChangePct(a);
          bVal = getChangePct(b);
          break;
        case "mrs_10":
          aVal = a.mrs_10 ?? -999;
          bVal = b.mrs_10 ?? -999;
          break;
        case "mrs_20":
          aVal = a.mrs_20 ?? -999;
          bVal = b.mrs_20 ?? -999;
          break;
        case "sector":
          aVal = a.sector ?? "";
          bVal = b.sector ?? "";
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
  }, [stocks, search, sectorFilter, verdict10Filter, verdict20Filter, convictionFilter, sortField, sortDirection]);

  // Count active filters
  const activeFilterCount = [
    sectorFilter !== "All Sectors",
    verdict10Filter !== "All",
    verdict20Filter !== "All",
    convictionFilter !== "All",
  ].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
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

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ticker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-40 pl-8 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

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
                label="Price"
                field="close"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                label="Chg %"
                field="change_pct"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                label="L3-10"
                field="mrs_10"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="L3-20"
                field="mrs_20"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Sector"
                field="sector"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No stocks match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredStocks.map((stock) => {
                const changePct = getChangePct(stock);
                return (
                  <TableRow key={stock.ticker} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link
                        href={`/stocks/${stock.ticker}`}
                        className="text-primary hover:underline"
                      >
                        {stock.ticker}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      ${stock.close?.toFixed(2) ?? "-"}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono tabular-nums",
                      changePct > 0 ? "text-emerald-500" : changePct < 0 ? "text-red-500" : ""
                    )}>
                      {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <L3Cell
                        mrs={stock.mrs_10}
                        verdict={stock.verdict_10}
                        conviction={stock.conviction_10}
                      />
                    </TableCell>
                    <TableCell>
                      <L3Cell
                        mrs={stock.mrs_20}
                        verdict={stock.verdict_20}
                        conviction={stock.conviction_20}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {stock.sector ?? "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
