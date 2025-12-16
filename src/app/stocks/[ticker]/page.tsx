import { notFound } from "next/navigation";
import { getStockDetail, getStockOHLCV, getStockOHLCVExtended, getMRSHistory } from "@/lib/queries/stocks";
import { getSectorMRS, getStockSector, getSectorRankHistory } from "@/lib/queries/sectors";
import { getVIXHistory } from "@/lib/queries/trading-days";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriceVolumeChart, SectorMRSChart, MRSTrajectoryChart } from "@/components/charts";

interface StockDetailPageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ date?: string; range?: string }>;
}

const VALID_RANGES = [20, 40, 60] as const;
type ChartRange = typeof VALID_RANGES[number];

function formatNumber(value: number | null, decimals: number = 2): string {
  if (value === null || value === undefined) return "-";
  return value.toFixed(decimals);
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "-";
  const pct = value * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

export default async function StockDetailPage({ params, searchParams }: StockDetailPageProps) {
  const { ticker } = await params;
  const { date, range: rangeParam } = await searchParams;

  // Parse and validate range (default 20)
  const parsedRange = rangeParam ? parseInt(rangeParam, 10) : 20;
  const range: ChartRange = VALID_RANGES.includes(parsedRange as ChartRange) ? parsedRange as ChartRange : 20;

  const stock = getStockDetail(ticker, date);

  if (!stock) {
    notFound();
  }

  const ohlcv = getStockOHLCV(ticker, range, date);
  const prevClose = ohlcv.length > 1 ? ohlcv[ohlcv.length - 2].close : stock.close;
  const change = stock.close - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

  // Chart data - use range for all chart-related queries
  const ohlcvExtended = getStockOHLCVExtended(ticker, range, date);
  const mrsHistory = getMRSHistory(ticker, range, date);
  const sectors = getSectorMRS(date);
  const stockSector = getStockSector(ticker);
  const vixHistory = getVIXHistory(range, date);
  const sectorRankHistory = stockSector ? getSectorRankHistory(stockSector, range, date) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{stock.ticker}</h2>
          <p className="text-muted-foreground">
            {stock.company_name || "Unknown Company"} •{" "}
            {stock.sector || "Unknown Sector"}
            {stockSector && sectors.length > 0 && (() => {
              const sortedSectors = [...sectors].sort((a, b) => (b.mrs_20 || 0) - (a.mrs_20 || 0));
              const rank = sortedSectors.findIndex(s => s.sector_name === stockSector) + 1;
              return rank > 0 ? ` (#${rank} of ${sectors.length})` : "";
            })()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tabular-nums">${formatNumber(stock.close)}</div>
          <div
            className={`text-lg tabular-nums ${
              change >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {change >= 0 ? "+" : ""}
            {formatNumber(change)} ({changePercent >= 0 ? "+" : ""}
            {formatNumber(changePercent)}%)
          </div>
        </div>
      </div>

      {/* P1: Price + Volume Chart */}
      <Card className="py-6 gap-0">
        <CardContent className="pt-0">
          <PriceVolumeChart
            data={ohlcvExtended}
            vixHistory={vixHistory}
            sectorRankHistory={sectorRankHistory}
            height={560}
            currentRange={range}
          />
        </CardContent>
      </Card>

      {/* P2 & P3: Side by side charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* P2: Sector MRS Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Sector Relative Strength</CardTitle>
          </CardHeader>
          <CardContent>
            <SectorMRSChart
              sectors={sectors}
              currentSector={stockSector}
              height={350}
            />
          </CardContent>
        </Card>

        {/* P3: MRS Trajectory */}
        <Card>
          <CardHeader>
            <CardTitle>MRS Trajectory (20-Day)</CardTitle>
          </CardHeader>
          <CardContent>
            <MRSTrajectoryChart data={mrsHistory} height={350} />
          </CardContent>
        </Card>
      </div>

      {/* Indicators */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>MRS Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">MRS 5</span>
                <span
                  className={`font-mono tabular-nums ${
                    stock.mrs_5 && stock.mrs_5 > 0
                      ? "text-emerald-500"
                      : stock.mrs_5 && stock.mrs_5 < 0
                      ? "text-red-500"
                      : ""
                  }`}
                >
                  {formatPercent(stock.mrs_5)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">MRS 10</span>
                <span
                  className={`font-mono tabular-nums ${
                    stock.mrs_10 && stock.mrs_10 > 0
                      ? "text-emerald-500"
                      : stock.mrs_10 && stock.mrs_10 < 0
                      ? "text-red-500"
                      : ""
                  }`}
                >
                  {formatPercent(stock.mrs_10)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">MRS 20</span>
                <span
                  className={`font-mono tabular-nums ${
                    stock.mrs_20 && stock.mrs_20 > 0
                      ? "text-emerald-500"
                      : stock.mrs_20 && stock.mrs_20 < 0
                      ? "text-red-500"
                      : ""
                  }`}
                >
                  {formatPercent(stock.mrs_20)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">MRS 20 CS</span>
                <span
                  className={`font-mono tabular-nums ${
                    stock.mrs_20_cs && stock.mrs_20_cs > 0
                      ? "text-emerald-500"
                      : stock.mrs_20_cs && stock.mrs_20_cs < 0
                      ? "text-red-500"
                      : ""
                  }`}
                >
                  {formatPercent(stock.mrs_20_cs)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technical Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">RSI (14)</span>
                <span
                  className={`font-mono tabular-nums ${
                    stock.rsi_14 && stock.rsi_14 > 70
                      ? "text-red-500"
                      : stock.rsi_14 && stock.rsi_14 < 30
                      ? "text-emerald-500"
                      : ""
                  }`}
                >
                  {formatNumber(stock.rsi_14, 1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ATR (14)</span>
                <span className="font-mono tabular-nums">{formatNumber(stock.atr_14)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">MACD</span>
                <span
                  className={`font-mono tabular-nums ${
                    stock.macd && stock.macd > 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {formatNumber(stock.macd)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
