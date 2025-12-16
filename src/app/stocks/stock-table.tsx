"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { StockDetail } from "@/lib/queries/stocks";

interface StockTableProps {
  stocks: StockDetail[];
}

function formatNumber(value: number | null, decimals: number = 2): string {
  if (value === null || value === undefined) return "-";
  return value.toFixed(decimals);
}

function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function getVerdictVariant(verdict: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!verdict) return "outline";
  const v = verdict.toLowerCase();
  if (v.includes("strong buy") || v.includes("buy")) return "default";
  if (v.includes("sell")) return "destructive";
  return "secondary";
}

export function StockTable({ stocks }: StockTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Ticker</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Volume</TableHead>
            <TableHead className="text-right">MRS 20</TableHead>
            <TableHead className="text-right">RSI</TableHead>
            <TableHead className="text-center">L3 Signal</TableHead>
            <TableHead>Sector</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.map((stock) => (
            <TableRow key={stock.ticker} className="cursor-pointer hover:bg-muted/50">
              <TableCell className="font-medium">
                <Link
                  href={`/stocks/${stock.ticker}`}
                  className="text-primary hover:underline"
                >
                  {stock.ticker}
                </Link>
              </TableCell>
              <TableCell className="max-w-48 truncate text-muted-foreground">
                {stock.company_name || "-"}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                ${formatNumber(stock.close)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {formatVolume(stock.volume)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                <span
                  className={
                    stock.mrs_20 && stock.mrs_20 > 0
                      ? "text-emerald-500"
                      : stock.mrs_20 && stock.mrs_20 < 0
                      ? "text-red-500"
                      : ""
                  }
                >
                  {formatNumber(stock.mrs_20, 1)}%
                </span>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatNumber(stock.rsi_14, 0)}
              </TableCell>
              <TableCell className="text-center">
                {stock.verdict_10 ? (
                  <Badge variant={getVerdictVariant(stock.verdict_10)}>
                    {stock.verdict_10}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {stock.sector || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
