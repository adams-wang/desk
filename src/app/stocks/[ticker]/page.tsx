import { notFound } from "next/navigation";
import { getStockDetail, getStockOHLCV, getStockOHLCVExtended, getMRSHistory, getAnalystActions, getAnalystTargets, getL3Contracts } from "@/lib/queries/stocks";
import { getSectorMRS, getSectorMRSHistory, getStockSector, getSectorRankHistory } from "@/lib/queries/sectors";
import { getVIXHistory, getNASDAQHistory } from "@/lib/queries/trading-days";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriceVolumeChart, SectorMRSChart, MRSTrajectoryChart } from "@/components/charts";
import { TradeSetupCard } from "@/components/trade-setup-card";

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
  const sectorHistory = getSectorMRSHistory(10, date); // 10 days for sector rotation analysis
  const latestSectors = sectorHistory.length > 0 ? sectorHistory[sectorHistory.length - 1].sectors : [];
  const stockSector = getStockSector(ticker);
  const vixHistory = getVIXHistory(range, date);
  const nasdaqHistory = getNASDAQHistory(range, date);
  const sectorRankHistory = stockSector ? getSectorRankHistory(stockSector, range, date) : [];

  // Analyst data
  const analystActions = getAnalystActions(ticker, date);
  const analystTargets = getAnalystTargets(ticker, date);

  // L3 contracts
  const { l3_10, l3_20 } = getL3Contracts(ticker, date);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{stock.ticker}</h2>
          <p className="text-muted-foreground">
            {stock.company_name || "Unknown Company"} •{" "}
            {stock.sector || "Unknown Sector"}
            {stockSector && latestSectors.length > 0 && (() => {
              const sortedSectors = [...latestSectors].sort((a, b) => (b.mrs_20 || 0) - (a.mrs_20 || 0));
              const rank = sortedSectors.findIndex(s => s.sector_name === stockSector) + 1;
              return rank > 0 ? ` (#${rank} of ${latestSectors.length})` : "";
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
            <CardTitle>Sector Rotation</CardTitle>
          </CardHeader>
          <CardContent>
            <SectorMRSChart
              history={sectorHistory}
              currentSector={stockSector}
              height={380}
            />
          </CardContent>
        </Card>

        {/* P3: MRS Trajectory */}
        <Card>
          <CardHeader>
            <CardTitle>Relative Strength Trajectory</CardTitle>
          </CardHeader>
          <CardContent>
            <MRSTrajectoryChart data={mrsHistory} nasdaqData={nasdaqHistory} height={420} />
          </CardContent>
        </Card>
      </div>

      {/* Analyst Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Analyst Actions */}
        <Card className="gap-4 py-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Analyst Actions</CardTitle>
              {analystActions && (
                <Badge
                  variant={
                    analystActions.trend === "BULLISH"
                      ? "default"
                      : analystActions.trend === "BEARISH"
                      ? "destructive"
                      : "secondary"
                  }
                  className={analystActions.trend === "BULLISH" ? "bg-emerald-500" : ""}
                >
                  {analystActions.trend}
                </Badge>
              )}
            </div>
            {analystActions && (
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="text-emerald-500">▲{analystActions.upgrades} Up</span>
                <span className="text-red-500">▼{analystActions.downgrades} Down</span>
                <span>{analystActions.maintains} Hold</span>
                {analystActions.cluster && (
                  <Badge variant="outline" className="text-xs">Cluster</Badge>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {analystActions ? (
              <div className="space-y-1.5">
                {analystActions.recent.map((action, i) => (
                  <div key={i} className="flex items-center justify-between text-sm gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-muted-foreground w-14 shrink-0">
                        {new Date(action.action_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <span className="truncate" title={action.firm}>{action.firm}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          action.action === "up"
                            ? "bg-emerald-500/20 text-emerald-500"
                            : action.action === "down"
                            ? "bg-red-500/20 text-red-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {action.action === "up" ? "▲" : action.action === "down" ? "▼" : "–"}
                      </span>
                      {action.action === "up" || action.action === "down" ? (
                        <span className="text-muted-foreground">
                          {action.from_grade || "?"} → <span className={action.action === "up" ? "text-emerald-500" : "text-red-500"}>{action.to_grade}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{action.to_grade || "-"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent analyst actions</p>
            )}
          </CardContent>
        </Card>

        {/* Price Targets */}
        <Card className="gap-4 py-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Price Targets</CardTitle>
              {analystTargets && (
                <Badge
                  variant={
                    analystTargets.signal.includes("BULLISH")
                      ? "default"
                      : analystTargets.signal.includes("BEARISH")
                      ? "destructive"
                      : "secondary"
                  }
                  className={analystTargets.signal.includes("BULLISH") ? "bg-emerald-500" : ""}
                >
                  {analystTargets.signal.replace("VERY_", "")}
                </Badge>
              )}
            </div>
            {analystTargets && (
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="text-emerald-500">▲{analystTargets.raises} Raises</span>
                <span className="text-red-500">▼{analystTargets.lowers} Lowers</span>
                {analystTargets.avg_raise_pct > 0 && (
                  <span className="text-emerald-500">+{analystTargets.avg_raise_pct.toFixed(1)}% avg</span>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {analystTargets ? (
              <div className="space-y-1.5">
                {analystTargets.recent.map((target, i) => (
                  <div key={i} className="flex items-center justify-between text-sm gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-muted-foreground w-14 shrink-0">
                        {new Date(target.action_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <span className="truncate" title={target.firm}>{target.firm}</span>
                    </div>
                    <div className="flex items-center font-mono tabular-nums shrink-0">
                      <span className="w-10 text-right text-muted-foreground">
                        {target.prior_target ? `$${target.prior_target.toFixed(0)}` : ""}
                      </span>
                      <span className="w-6 text-center text-muted-foreground">
                        {target.prior_target ? "→" : ""}
                      </span>
                      <span className="w-16 text-right font-medium">
                        ${target.target_price.toFixed(0)}
                      </span>
                      <span
                        className={`w-24 text-right ${
                          target.target_change_pct && target.target_change_pct > 0
                            ? "text-emerald-500"
                            : target.target_change_pct && target.target_change_pct < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {target.target_change_pct
                          ? `${target.target_change_pct > 0 ? "+" : ""}${target.target_change_pct.toFixed(1)}%`
                          : "New"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent price targets</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Indicators */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Trade Setup Card */}
        <TradeSetupCard l3_10={l3_10} l3_20={l3_20} />

        <Card className="gap-4 py-5">
          <CardHeader>
            <CardTitle>Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Sharpe */}
              <div className="flex items-center justify-between">
                <span className="text-foreground font-medium">Sharpe (20d)</span>
                <div className="flex items-center gap-4">
                  <span className="font-mono tabular-nums font-medium w-16 text-right">
                    {formatNumber(stock.sharpe_ratio_20, 2)}
                  </span>
                  <span className="w-20 text-right text-muted-foreground">
                    {stock.sharpe_ratio_20 !== null && (
                      stock.sharpe_ratio_20 > 2 ? "Excellent"
                      : stock.sharpe_ratio_20 > 1 ? "Good"
                      : stock.sharpe_ratio_20 > 0.5 ? "Moderate"
                      : stock.sharpe_ratio_20 > 0 ? "Poor"
                      : "Losing"
                    )}
                  </span>
                </div>
              </div>
              {/* Volatility */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Volatility (20d)</span>
                <div className="flex items-center gap-4">
                  <span
                    className={`font-mono tabular-nums w-16 text-right ${
                      stock.volatility_20 && stock.volatility_20 > 0.4
                        ? "text-red-500"
                        : stock.volatility_20 && stock.volatility_20 < 0.2
                        ? "text-emerald-500"
                        : ""
                    }`}
                  >
                    {stock.volatility_20 ? `${(stock.volatility_20 * 100).toFixed(1)}%` : "-"}
                  </span>
                  <span
                    className={`w-20 text-right ${
                      stock.volatility_20 && stock.volatility_20 > 0.6
                        ? "text-red-500"
                        : stock.volatility_20 && stock.volatility_20 > 0.4
                        ? "text-orange-500"
                        : stock.volatility_20 && stock.volatility_20 > 0.25
                        ? "text-muted-foreground"
                        : stock.volatility_20 && stock.volatility_20 > 0.15
                        ? "text-emerald-500"
                        : "text-blue-500"
                    }`}
                  >
                    {stock.volatility_20 && (
                      stock.volatility_20 > 0.6 ? "Extreme"
                      : stock.volatility_20 > 0.4 ? "High"
                      : stock.volatility_20 > 0.25 ? "Normal"
                      : stock.volatility_20 > 0.15 ? "Low"
                      : "Compressed"
                    )}
                  </span>
                </div>
              </div>
              {/* Beta */}
              <div className="flex items-center justify-between">
                <span className="text-foreground font-medium">Beta (60d)</span>
                <div className="flex items-center gap-4">
                  <span className="font-mono tabular-nums font-medium w-16 text-right">
                    {formatNumber(stock.beta_60, 2)}
                  </span>
                  <span
                    className={`w-20 text-right ${
                      stock.beta_60 && stock.beta_60 > 1.2
                        ? "text-red-500"
                        : stock.beta_60 && stock.beta_60 < 0.8
                        ? "text-emerald-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {stock.beta_60 && stock.beta_60 > 1.2 ? "Aggressive"
                      : stock.beta_60 && stock.beta_60 < 0.8 ? "Defensive"
                      : "Average"}
                  </span>
                </div>
              </div>
              {/* Alpha */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Alpha (20d)</span>
                <div className="flex items-center gap-4">
                  <span
                    className={`font-mono tabular-nums w-16 text-right ${
                      stock.alpha_20d && stock.alpha_20d > 0
                        ? "text-emerald-500"
                        : stock.alpha_20d && stock.alpha_20d < 0
                        ? "text-red-500"
                        : ""
                    }`}
                  >
                    {stock.alpha_20d ? `${stock.alpha_20d >= 0 ? "+" : ""}${stock.alpha_20d.toFixed(1)}%` : "-"}
                  </span>
                  <span
                    className={`w-20 text-right ${
                      stock.alpha_20d && stock.alpha_20d > 5
                        ? "text-emerald-500"
                        : stock.alpha_20d && stock.alpha_20d > 2
                        ? "text-emerald-500"
                        : stock.alpha_20d && stock.alpha_20d > -2
                        ? "text-muted-foreground"
                        : stock.alpha_20d && stock.alpha_20d > -5
                        ? "text-orange-500"
                        : "text-red-500"
                    }`}
                  >
                    {stock.alpha_20d !== null && stock.alpha_20d !== undefined && (
                      stock.alpha_20d > 5 ? "Strong"
                      : stock.alpha_20d > 2 ? "Moderate+"
                      : stock.alpha_20d > -2 ? "In Line"
                      : stock.alpha_20d > -5 ? "Moderate-"
                      : "Weak"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
