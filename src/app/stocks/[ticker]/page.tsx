import { notFound } from "next/navigation";
import { getStockDetail, getStockOHLCV, getStockOHLCVExtended, getMRSHistory } from "@/lib/queries/stocks";
import { getSectorMRS, getStockSector } from "@/lib/queries/sectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriceVolumeChart, SectorMRSChart, MRSTrajectoryChart } from "@/components/charts";

interface StockDetailPageProps {
  params: Promise<{ ticker: string }>;
}

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

export default async function StockDetailPage({ params }: StockDetailPageProps) {
  const { ticker } = await params;
  const stock = getStockDetail(ticker);

  if (!stock) {
    notFound();
  }

  const ohlcv = getStockOHLCV(ticker, 20);
  const prevClose = ohlcv.length > 1 ? ohlcv[ohlcv.length - 2].close : stock.close;
  const change = stock.close - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

  // Chart data
  const ohlcvExtended = getStockOHLCVExtended(ticker, 20);
  const mrsHistory = getMRSHistory(ticker, 20);
  const sectors = getSectorMRS();
  const stockSector = getStockSector(ticker);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">{stock.ticker}</h2>
            {stock.verdict_10 && (
              <Badge
                variant={
                  stock.verdict_10.toLowerCase().includes("buy")
                    ? "default"
                    : stock.verdict_10.toLowerCase().includes("sell")
                    ? "destructive"
                    : "secondary"
                }
              >
                {stock.verdict_10}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {stock.company_name || "Unknown Company"} • {stock.sector || "Unknown Sector"}
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

      {/* Price Info */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tabular-nums">${formatNumber(stock.open)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tabular-nums text-emerald-500">
              ${formatNumber(stock.high)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tabular-nums text-red-500">
              ${formatNumber(stock.low)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tabular-nums">{formatVolume(stock.volume)}</div>
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
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gap</span>
                <span className="font-mono tabular-nums">
                  {stock.gap_type || "-"} {stock.gap_pct ? `(${formatPercent(stock.gap_pct)})` : ""}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* L3 Verdicts */}
      <Card>
        <CardHeader>
          <CardTitle>L3 Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">MRS 10 Verdict</div>
              <div className="mt-1 flex items-center gap-2">
                {stock.verdict_10 ? (
                  <>
                    <Badge
                      variant={
                        stock.verdict_10.toLowerCase().includes("buy")
                          ? "default"
                          : stock.verdict_10.toLowerCase().includes("sell")
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {stock.verdict_10}
                    </Badge>
                    {stock.conviction_10 && (
                      <span className="text-sm text-muted-foreground">
                        ({stock.conviction_10})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">No signal</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">MRS 20 Verdict</div>
              <div className="mt-1 flex items-center gap-2">
                {stock.verdict_20 ? (
                  <>
                    <Badge
                      variant={
                        stock.verdict_20.toLowerCase().includes("buy")
                          ? "default"
                          : stock.verdict_20.toLowerCase().includes("sell")
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {stock.verdict_20}
                    </Badge>
                    {stock.conviction_20 && (
                      <span className="text-sm text-muted-foreground">
                        ({stock.conviction_20})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">No signal</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candle Pattern */}
      {stock.ofd_code && (
        <Card>
          <CardHeader>
            <CardTitle>Candle Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">OFD Code</span>
                <span className="font-mono">{stock.ofd_code}</span>
              </div>
              {stock.pattern && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pattern</span>
                  <span>{stock.pattern}</span>
                </div>
              )}
              {stock.conclusion && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conclusion</span>
                  <span>{stock.conclusion}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* P1: Price + Volume Chart */}
      <Card className="py-6 gap-0">
        <CardContent className="pt-0">
          <PriceVolumeChart data={ohlcvExtended} height={480} />
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
    </div>
  );
}
