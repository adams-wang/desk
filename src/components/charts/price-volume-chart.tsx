"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
  Rectangle,
  Customized,
} from "recharts";
import {
  classifyGapPattern,
  getVerdictCode,
  getVolumeBarColor,
  getVolumeRegime,
  checkDivergence,
  getPatternLabel,
  calculateVolumeAcceleration,
  VOLUME_CLIMAX_THRESHOLD,
} from "@/lib/gap-indicators";

interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  volume_10ma: number | null;
  volume_10_ts: number | null;
  gap_pct: number | null;
  gap_type: string | null;
  gap_filled: number | null;
  gap_volume_ratio: number | null;
  gap_percentile: number | null;
  mrs_20: number | null;
  mrs_20_ts: number | null;
  ofd_code: string | null;
  conclusion: string | null;
  pattern: string | null;
  body_size_pct: number | null;
  candle_volume_ratio: number | null;
  upper_wick_ratio: number | null;
  lower_wick_ratio: number | null;
  reversal_confirmed: string | null;
  verdict_10: string | null;
  verdict_20: string | null;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
}

type ChartMode = "line" | "candle";

interface PriceVolumeChartProps {
  data: OHLCVData[];
  height?: number;
  defaultMode?: ChartMode;
}

// Transform data point for chart
function transformDataPoint(d: OHLCVData, idx: number, allData: OHLCVData[]) {
  const prevClose = idx > 0 ? allData[idx - 1].close : null;
  const isUp = d.close >= d.open;
  const volumeColor = getVolumeBarColor(d.volume_10_ts, isUp);
  const volumeRegime = getVolumeRegime(d.volume_10_ts);
  const verdictInfo = getVerdictCode(d.verdict_10, d.verdict_20);
  const gapPattern = classifyGapPattern(
    d.gap_pct,
    d.mrs_20,
    d.mrs_20_ts,
    d.gap_volume_ratio,
    d.gap_percentile,
    d.gap_filled
  );
  const divergence = checkDivergence(d.open, d.close, prevClose);
  const patternLabel = getPatternLabel(d.pattern, d.reversal_confirmed);

  return {
    ...d,
    idx,
    fullDate: d.date,
    dateLabel: d.date.slice(5), // MM-DD
    prevClose,
    isUp,
    volumeColor: volumeColor.color,
    volumeAlpha: volumeColor.alpha,
    volumePercentile: d.volume_10_ts,
    volumeRegime,
    verdictInfo,
    gapPattern,
    divergence,
    patternLabel,
  };
}

// Custom tooltip component
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: ReturnType<typeof transformDataPoint>;
  }>;
}) {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload;
  const verdictInfo = getVerdictCode(d.verdict_10, d.verdict_20);

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm">
      <p className="font-semibold text-foreground mb-2">{d.fullDate}</p>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Close:</span>{" "}
          <span className="text-foreground font-mono font-bold">${d.close.toFixed(2)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Volume:</span>{" "}
          <span className="text-foreground font-mono">
            {(d.volume / 1e6).toFixed(2)}M
          </span>
          {d.volumePercentile !== null && (
            <span className="text-muted-foreground ml-1">
              ({d.volumePercentile.toFixed(0)}%ile)
            </span>
          )}
        </p>
        {d.ofd_code && (
          <p>
            <span className="text-muted-foreground">OFD:</span>{" "}
            <span className="text-amber-500 font-mono font-bold">{d.ofd_code}</span>
          </p>
        )}
        {verdictInfo.code !== "?|?" && (
          <p>
            <span className="text-muted-foreground">L3:</span>{" "}
            <span style={{ color: verdictInfo.color }} className="font-bold">
              {verdictInfo.code}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

// Candlestick Chart using Recharts (same as Analysis for consistency)
// Calculate Simple Moving Average
function calculateSMASimple(data: OHLCVData[], period: number): (number | null)[] {
  return data.map((_, idx) => {
    if (idx < period - 1) return null;
    const sum = data.slice(idx - period + 1, idx + 1).reduce((acc, d) => acc + d.close, 0);
    return sum / period;
  });
}

// Candlestick renderer using Customized component for proper Y-axis mapping
interface CandlestickRendererProps {
  xAxisMap?: Record<string, { scale: (value: number) => number; bandSize?: number }>;
  yAxisMap?: Record<string, { scale: (value: number) => number }>;
  formattedGraphicalItems?: Array<{
    props: { data: Array<{ payload: OHLCVData & { isUp: boolean; dateLabel: string } }> };
  }>;
  offset?: { left: number; top: number; width: number; height: number };
}

const CandlestickRenderer = (props: CandlestickRendererProps) => {
  const { xAxisMap, yAxisMap, formattedGraphicalItems, offset } = props;

  if (!xAxisMap || !yAxisMap || !formattedGraphicalItems || !offset) return null;

  // Get the first (and only) formatted item which contains our data
  const dataItem = formattedGraphicalItems[0];
  if (!dataItem?.props?.data) return null;

  const chartData = dataItem.props.data;
  const xAxis = Object.values(xAxisMap)[0];
  const yAxis = yAxisMap["price"];

  if (!xAxis || !yAxis) return null;

  const bandWidth = xAxis.bandSize || 30;
  const barWidth = bandWidth * 0.7; // 70% of band width for candle body

  return (
    <g className="candlesticks">
      {chartData.map((item, index) => {
        const { payload } = item;
        if (!payload) return null;

        const { open, high, low, close, isUp } = payload;

        // Get X position (center of band)
        const xPos = xAxis.scale(index) + bandWidth / 2;

        // Get Y positions using yAxis scale
        const highY = yAxis.scale(high);
        const lowY = yAxis.scale(low);
        const openY = yAxis.scale(open);
        const closeY = yAxis.scale(close);

        const bodyTop = Math.min(openY, closeY);
        const bodyBottom = Math.max(openY, closeY);
        const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
        const bodyX = xPos - barWidth / 2;

        const color = isUp ? "#22c55e" : "#ef4444";

        return (
          <g key={`candle-${index}`}>
            {/* Upper wick */}
            <line
              x1={xPos}
              y1={highY}
              x2={xPos}
              y2={bodyTop}
              stroke={color}
              strokeWidth={1}
            />
            {/* Lower wick */}
            <line
              x1={xPos}
              y1={bodyBottom}
              x2={xPos}
              y2={lowY}
              stroke={color}
              strokeWidth={1}
            />
            {/* Body - filled for up, hollow for down */}
            <rect
              x={bodyX}
              y={bodyTop}
              width={barWidth}
              height={bodyHeight}
              fill={isUp ? color : "transparent"}
              stroke={color}
              strokeWidth={isUp ? 1 : 1.5}
            />
          </g>
        );
      })}
    </g>
  );
};

// Shared tooltip for both candlestick and volume charts
function CandleTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      date: string;
      dateLabel: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      isUp: boolean;
      sma_20: number | null;
      sma_50: number | null;
      sma_200: number | null;
    };
  }>;
}) {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload;
  const isBullish = d.close >= d.open;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-foreground">{d.date}</span>
        <span className={`text-xs font-bold ${isBullish ? "text-green-500" : "text-red-500"}`}>
          {isBullish ? "▲ Bullish" : "▼ Bearish"}
        </span>
      </div>
      <div className="space-y-1 text-xs font-mono">
        <p>
          <span className="text-orange-400">O:</span>{" "}
          <span className="text-foreground">{d.open.toFixed(2)}</span>
          <span className="text-muted-foreground ml-2">H:</span>{" "}
          <span className="text-green-400">{d.high.toFixed(2)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">L:</span>{" "}
          <span className="text-red-400">{d.low.toFixed(2)}</span>
          <span className="text-muted-foreground ml-2">C:</span>{" "}
          <span className="text-foreground font-bold">{d.close.toFixed(2)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Vol:</span>{" "}
          <span className="text-cyan-400">{(d.volume / 1e6).toFixed(2)}M</span>
        </p>
        {(d.sma_20 || d.sma_50 || d.sma_200) && (
          <p>
            {d.sma_20 && <span className="text-green-400 mr-2">MA20:{d.sma_20.toFixed(0)}</span>}
            {d.sma_50 && <span className="text-blue-400 mr-2">MA50:{d.sma_50.toFixed(0)}</span>}
            {d.sma_200 && <span className="text-orange-400">MA200:{d.sma_200.toFixed(0)}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function CandlestickChart({
  data,
  height,
}: {
  data: OHLCVData[];
  height: number;
}) {
  // Prepare chart data with OHLC - use SMA from database
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      dateLabel: d.date.slice(5), // MM-DD
      isUp: d.close >= d.open,
      // For volume bar colors
      volumeColor: d.close >= d.open ? "#22c55e" : "transparent",
      volumeStroke: d.close >= d.open ? "#22c55e" : "#ef4444",
    }));
  }, [data]);

  // Get latest data for display
  const latestData = chartData[chartData.length - 1];
  const prevClose = chartData.length > 1 ? chartData[chartData.length - 2].close : latestData?.open;

  const displayInfo = latestData
    ? {
        open: latestData.open,
        high: latestData.high,
        low: latestData.low,
        close: latestData.close,
        change: latestData.close - (prevClose ?? latestData.open),
        changePct: ((latestData.close - (prevClose ?? latestData.open)) / (prevClose ?? latestData.open)) * 100,
        volume: latestData.volume,
        sma_20: latestData.sma_20,
        sma_50: latestData.sma_50,
        sma_200: latestData.sma_200,
      }
    : null;

  // Calculate price range for Y axis
  const priceMin = Math.min(...data.map((d) => d.low));
  const priceMax = Math.max(...data.map((d) => d.high));
  const priceRange = priceMax - priceMin;
  const pricePadding = priceRange * 0.1;
  const volumeMax = Math.max(...data.map((d) => d.volume));

  // Y domain for price
  const priceDomain = [priceMin - pricePadding, priceMax + pricePadding];

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-card rounded-lg">
        <p className="text-muted-foreground">No chart data available</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-1">
      {/* OHLC Info Bar - single row, no wrap */}
      {displayInfo && (
        <div className="flex items-center justify-between px-2 py-1 bg-muted/50 rounded text-[11px] font-mono overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="text-orange-400">O {displayInfo.open.toFixed(2)}</span>
            <span>H <span className="text-green-400">{displayInfo.high.toFixed(2)}</span></span>
            <span>L <span className="text-red-400">{displayInfo.low.toFixed(2)}</span></span>
            <span>C {displayInfo.close.toFixed(2)}</span>
            <span className={displayInfo.changePct >= 0 ? "text-green-400" : "text-red-400"}>
              {displayInfo.changePct >= 0 ? "+" : ""}{displayInfo.changePct.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            {displayInfo.sma_20 && <span className="text-green-400">MA20:{displayInfo.sma_20.toFixed(0)}</span>}
            {displayInfo.sma_50 && <span className="text-blue-400">MA50:{displayInfo.sma_50.toFixed(0)}</span>}
            {displayInfo.sma_200 && <span className="text-orange-400">MA200:{displayInfo.sma_200.toFixed(0)}</span>}
          </div>
        </div>
      )}

      {/* Charts container - no gap between candlestick and volume */}
      <div>
      {/* Candlestick Chart - 61.8% (golden ratio) */}
      <ResponsiveContainer width="100%" height={height * 0.618}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} syncId="candle-sync">
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" strokeOpacity={0.5} />

          <XAxis
            dataKey="dateLabel"
            axisLine={false}
            tickLine={false}
            tick={false}
          />

          <YAxis
            yAxisId="price"
            orientation="left"
            domain={priceDomain}
            allowDataOverflow={true}
            className="text-muted-foreground"
            fontSize={10}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CandleTooltip />} />

          {/* Candlesticks - render body using close-open range */}
          <Bar
            yAxisId="price"
            dataKey={(d: typeof chartData[0]) => [Math.min(d.open, d.close), Math.max(d.open, d.close)]}
            barSize={32}
            shape={(props: any) => {
              const { x, y, width, height, payload } = props;
              if (!payload || !x || !width) return null;

              const { open, high, low, close, isUp } = payload;
              const color = isUp ? "#22c55e" : "#ef4444";
              const centerX = x + width / 2;
              const bodyWidth = width * 0.95; // Match Analysis chart bar width
              const bodyX = x + (width - bodyWidth) / 2;

              // Body height and position from props (already calculated by Recharts)
              const bodyY = y || 0;
              const bodyHeight = Math.max(height || 1, 1);

              // Calculate wick positions - need to use price ratios
              // Y increases downward, so high price = lower Y value
              const priceRange = priceDomain[1] - priceDomain[0];
              const chartHeight = bodyHeight / Math.abs(close - open) * priceRange || 200;
              const pixelsPerDollar = chartHeight / priceRange;

              const bodyTop = Math.min(y, y + (height || 0));
              const bodyBottom = Math.max(y, y + (height || 0));

              // Wick positions relative to body (high >= max(open,close), low <= min(open,close))
              const highY = bodyTop - (high - Math.max(open, close)) * pixelsPerDollar;
              const lowY = bodyBottom + (Math.min(open, close) - low) * pixelsPerDollar;

              return (
                <g>
                  {/* Upper wick */}
                  <line x1={centerX} y1={highY} x2={centerX} y2={bodyTop} stroke={color} strokeWidth={1} />
                  {/* Lower wick */}
                  <line x1={centerX} y1={bodyBottom} x2={centerX} y2={lowY} stroke={color} strokeWidth={1} />
                  {/* Body */}
                  <rect
                    x={bodyX}
                    y={bodyTop}
                    width={bodyWidth}
                    height={Math.max(bodyBottom - bodyTop, 1)}
                    fill={isUp ? color : "transparent"}
                    stroke={color}
                    strokeWidth={isUp ? 1 : 1.5}
                  />
                </g>
              );
            }}
          />

          {/* SMA Lines from database */}
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="sma_20"
            stroke="#22c55e"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="sma_50"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="sma_200"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Volume Chart - 38.2% */}
      <ResponsiveContainer width="100%" height={height * 0.382}>
        <ComposedChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 5 }} syncId="candle-sync">
          <XAxis
            dataKey="dateLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            interval={0}
          />

          <YAxis
            orientation="left"
            domain={[0, volumeMax * 1.2]}
            className="text-muted-foreground"
            fontSize={9}
            tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
            axisLine={false}
            tickLine={false}
          />

          {/* Hidden tooltip to enable syncId hover detection */}
          <Tooltip content={() => null} />

          {/* Volume bars - solid for both up and down */}
          <Bar dataKey="volume" barSize={32} radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`vol-${index}`}
                fill={entry.isUp ? "#22c55e" : "#ef4444"}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
      </div>

      {/* Legend - same structure as Analysis */}
      <div className="flex items-center justify-center gap-4 pt-1 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
          <span>Bullish</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 border border-red-500 rounded-sm"></div>
          <span>Bearish</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-green-500"></div>
          <span>MA20</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500"></div>
          <span>MA50</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-orange-500"></div>
          <span>MA200</span>
        </div>
      </div>
    </div>
  );
}

// Custom label renderer for percentile INSIDE bars
const renderPercentileLabel = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}) => {
  const { x, y, width, height, value } = props;
  if (value === null || value === undefined || !x || !y || !width || !height) return null;
  if (height < 20) return null; // Don't show on very short bars

  const pct = value as number;
  const labelY = y + Math.min(height * 0.3, 15); // Position near top of bar

  return (
    <text
      x={x + width / 2}
      y={labelY}
      fill={pct >= 75 ? "#ffffff" : pct >= 25 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)"}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={9}
      fontWeight="bold"
      fontFamily="monospace"
    >
      {pct.toFixed(0)}
    </text>
  );
};

// Custom label renderer for L3 verdicts ABOVE bars
const renderVerdictLabel = (props: {
  x?: number;
  y?: number;
  width?: number;
  value?: string;
}) => {
  const { x, y, width, value } = props;
  if (!x || !y || !width || !value || value === "?|?") return null;

  // Determine color based on verdict
  let color = "#6b7280"; // gray default
  if (value === "B|B") color = "#22c55e";
  else if (value === "B|H" || value === "H|B") color = "#3b82f6";
  else if (value.includes("H") && !value.includes("A")) color = "#22c55e";
  else if (value.includes("A")) color = "#9ca3af";

  return (
    <text
      x={x + width / 2}
      y={y - 8}
      fill={color}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={10}
      fontWeight="bold"
      fontFamily="monospace"
    >
      {value}
    </text>
  );
};

// Custom label renderer for OFD codes BELOW bars
const renderOfdLabel = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: string;
}) => {
  const { x, y, width, height, value } = props;
  if (!x || !y || !width || !height || !value) return null;

  return (
    <text
      x={x + width / 2}
      y={y + height + 12}
      fill="#d97706"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={9}
      fontWeight="bold"
      fontFamily="monospace"
    >
      {value}
    </text>
  );
};

// Custom label renderer for dates BELOW OFD codes
const renderDateLabel = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: string;
}) => {
  const { x, y, width, height, value } = props;
  if (!x || !y || !width || !height || !value) return null;

  return (
    <text
      x={x + width / 2}
      y={y + height + 24}
      fill="#9ca3af"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={8}
      fontFamily="monospace"
    >
      {value}
    </text>
  );
};

// Line Chart with improved layout - using Recharts native alignment
function LineChart({ data, height }: { data: OHLCVData[]; height: number }) {
  const [maPeriod, setMaPeriod] = useState<10 | 20>(10);

  // Calculate volume MAs and percentiles for both 10d and 20d
  const chartDataWithMAs = useMemo(() => {
    if (!data || data.length === 0) return [];

    // First pass: calculate 20-day MA and collect volumes for percentile calculation
    const withMAs = data.map((d, idx) => {
      // Calculate 20MA
      const start20 = Math.max(0, idx - 19);
      const slice20 = data.slice(start20, idx + 1);
      const volume_20ma = slice20.length > 0
        ? slice20.reduce((sum, item) => sum + item.volume, 0) / slice20.length
        : null;

      return { ...d, volume_20ma };
    });

    // Second pass: calculate 20-day volume percentile
    return withMAs.map((d, idx) => {
      // Calculate 20-day percentile: rank current volume within last 20 days
      const start20 = Math.max(0, idx - 19);
      const slice20 = withMAs.slice(start20, idx + 1);
      const sortedVolumes = slice20.map(item => item.volume).sort((a, b) => a - b);
      const rank = sortedVolumes.findIndex(v => v >= d.volume);
      const volume_20_ts = slice20.length > 1
        ? (rank / (slice20.length - 1)) * 100
        : 50;

      return { ...d, volume_20_ts };
    });
  }, [data]);

  const chartData = useMemo(() => {
    if (!chartDataWithMAs || chartDataWithMAs.length === 0) return [];
    return chartDataWithMAs.map((d, idx) => {
      const transformed = transformDataPoint(d, idx, chartDataWithMAs as OHLCVData[]);
      // Add verdict code for XAxis
      const verdict = getVerdictCode(d.verdict_10, d.verdict_20);

      // Use selected period's percentile for volume color
      const selectedPercentile = maPeriod === 10 ? d.volume_10_ts : d.volume_20_ts;
      const isUp = d.close >= d.open;
      const volumeColorData = getVolumeBarColor(selectedPercentile, isUp);

      // Calculate volume ratio based on selected MA period
      const selectedMA = maPeriod === 10 ? d.volume_10ma : d.volume_20ma;
      const volumeRatio = selectedMA && selectedMA > 0
        ? d.volume / selectedMA
        : null;
      // Show acceleration label only for significant volume (>= 1.4x)
      const accelLabel = volumeRatio && volumeRatio >= 1.4
        ? `${volumeRatio.toFixed(1)}x`
        : null;

      // Pattern annotation - check for key patterns
      let patternAnnotation: { text: string; color: string; bg: string } | null = null;
      const pattern = d.pattern;
      const divergence = transformed.divergence;
      const reversal = d.reversal_confirmed;

      // Priority 1: Divergence
      if (divergence?.hasDivergence) {
        patternAnnotation = {
          text: divergence.label,
          color: "#ffffff",
          bg: divergence.type === "rally" ? "#f87171" : "#f87171",
        };
      }
      // Priority 2: Key reversal patterns
      else if (pattern && ["HAMMER", "SHOOTING_STAR", "HANGING_MAN", "INV_HAMMER", "LONG_SHADOW"].includes(pattern)) {
        if (reversal === "BULLISH_CONFIRMED" || reversal === "BEARISH_CONFIRMED") {
          patternAnnotation = {
            text: reversal === "BULLISH_CONFIRMED" ? "Confirmed" : "Confirmed",
            color: "#ffffff",
            bg: reversal === "BULLISH_CONFIRMED" ? "#166534" : "#991b1b",
          };
        } else if (pattern === "LONG_SHADOW") {
          patternAnnotation = { text: "Shadow", color: "#1e3a8a", bg: "#bfdbfe" };
        } else if (pattern === "HAMMER") {
          patternAnnotation = { text: "Hammer", color: "#374151", bg: "#e5e7eb" };
        } else if (pattern === "SHOOTING_STAR") {
          patternAnnotation = { text: "Star", color: "#374151", bg: "#e5e7eb" };
        } else if (pattern === "HANGING_MAN") {
          patternAnnotation = { text: "Hanging", color: "#374151", bg: "#e5e7eb" };
        } else if (pattern === "INV_HAMMER") {
          patternAnnotation = { text: "InvHammer", color: "#374151", bg: "#e5e7eb" };
        }
      }
      // Priority 3: Other meaningful conclusions (skip common ones)
      else if (d.conclusion && !["Indecision", "Volatile", "High Volatility", "Doji", "Neutral", "Rally", "Decline"].includes(d.conclusion)) {
        if (d.conclusion.includes("Resist") || d.conclusion.includes("Support") || d.conclusion.includes("Break")) {
          patternAnnotation = { text: d.conclusion, color: "#1e3a8a", bg: "#fef9c3" };
        }
      }

      return {
        ...transformed,
        verdictCode: verdict.code,
        volumeRatio,
        accelLabel,
        patternAnnotation,
        volume_20ma: d.volume_20ma,
        volume_20_ts: d.volume_20_ts,
        // Override with selected period's color and percentile
        volumeColor: volumeColorData.color,
        volumeAlpha: volumeColorData.alpha,
        volumePercentile: selectedPercentile,
      };
    });
  }, [chartDataWithMAs, maPeriod]);

  const signalIdx = chartData.length - 1;
  const signalData = chartData[signalIdx];
  const priceMin = Math.min(...data.map((d) => d.low));
  const priceMax = Math.max(...data.map((d) => d.high));
  const priceRange = priceMax - priceMin;
  const pricePadding = priceRange * 0.12;
  const volumeMax = Math.max(...data.map((d) => d.volume));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-card rounded-lg">
        <p className="text-muted-foreground">No chart data available</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-1">
      {/* TOP: Summary Bar - compact */}
      <div className="flex items-center justify-between px-2 py-1 bg-muted/50 rounded text-[11px] font-mono">
        <div className="flex items-center gap-3">
          {signalData && (
            <>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Close:</span>
                <span className="text-foreground font-bold">${signalData.close.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Vol:</span>
                <span style={{ color: signalData.volumeRegime.color }} className="font-bold">
                  {signalData.volumeRegime.regime}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  ({signalData.volumePercentile?.toFixed(0) ?? "-"}%ile)
                </span>
              </div>
              {signalData.volume_10ma && signalData.volume_10ma > 0 && (
                <div className="flex items-center gap-0.5">
                  <span className="text-muted-foreground">Ratio:</span>
                  <span className="text-foreground font-bold">
                    {(signalData.volume / signalData.volume_10ma).toFixed(2)}x
                  </span>
                </div>
              )}
              {signalData.ofd_code && (
                <div className="flex items-center gap-0.5">
                  <span className="text-muted-foreground">Candle:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{signalData.ofd_code}</span>
                  {signalData.conclusion && (
                    <span className="text-foreground text-[10px]">→ {signalData.conclusion}</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {/* Bar Color Legend + MA Toggle */}
        <div className="flex items-center gap-4 text-[9px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 bg-green-700 rounded-sm"></span>
              <span className="w-2 h-2 bg-red-700 rounded-sm"></span>
              <span>≥75%</span>
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 bg-green-400 rounded-sm"></span>
              <span className="w-2 h-2 bg-red-400 rounded-sm"></span>
              <span>25-75%</span>
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 bg-gray-500 rounded-sm"></span>
              <span>&lt;25%</span>
            </span>
          </div>
          <div className="flex items-center gap-1 border-l border-border pl-3">
            <span className="text-muted-foreground">Vol.%</span>
            <button
              onClick={() => setMaPeriod(10)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                maPeriod === 10
                  ? "bg-blue-500 text-white"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              10d
            </button>
            <button
              onClick={() => setMaPeriod(20)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                maPeriod === 20
                  ? "bg-blue-500 text-white"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              20d
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CHART - tight margins for maximum info density */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 18, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" strokeOpacity={0.5} />

          {/* Top XAxis for L3 Verdicts */}
          <XAxis
            xAxisId="top"
            dataKey="verdictCode"
            orientation="top"
            axisLine={false}
            tickLine={false}
            tick={(props: { x: number; y: number; payload: { value: string } }) => {
              const { x, y, payload } = props;
              const verdict = payload?.value;
              if (!verdict || verdict === "?|?") return null;

              // Color per letter: B=green, A=red, H=gray
              const getLetterColor = (letter: string) => {
                if (letter === "B") return "#22c55e"; // green
                if (letter === "A") return "#ef4444"; // red
                return "#9ca3af"; // gray for H and others
              };

              const parts = verdict.split("|");
              const letter1 = parts[0] || "?";
              const letter2 = parts[1] || "?";

              return (
                <text x={x} y={y - 5} textAnchor="middle" fontSize={10} fontWeight="bold">
                  <tspan fill={getLetterColor(letter1)}>{letter1}</tspan>
                  <tspan fill="#6b7280">|</tspan>
                  <tspan fill={getLetterColor(letter2)}>{letter2}</tspan>
                </text>
              );
            }}
            interval={0}
          />

          {/* Bottom XAxis for OFD codes - positioned just below bars */}
          <XAxis
            xAxisId="bottom"
            dataKey="ofd_code"
            orientation="bottom"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#d97706", fontSize: 9, fontWeight: "bold", dy: 2 }}
            interval={0}
            height={16}
          />

          {/* Second bottom XAxis for dates */}
          <XAxis
            xAxisId="dates"
            dataKey="dateLabel"
            orientation="bottom"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9ca3af", fontSize: 10, dy: 3 }}
            interval={0}
            height={20}
          />

          <YAxis
            yAxisId="price"
            orientation="left"
            domain={[priceMin - pricePadding, priceMax + pricePadding]}
            className="text-muted-foreground"
            fontSize={10}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            yAxisId="volume"
            orientation="right"
            domain={[0, volumeMax * 1.2]}
            className="text-muted-foreground"
            fontSize={10}
            tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Volume Bars with percentile labels - wider bars for better visibility */}
          <Bar
            xAxisId="bottom"
            yAxisId="volume"
            dataKey="volume"
            barSize={32}
            radius={[2, 2, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.volumeColor}
                fillOpacity={entry.volumeAlpha + 0.2}
              />
            ))}
            {/* Percentile labels in center of bars */}
            <LabelList
              dataKey="volumePercentile"
              position="center"
              formatter={(value: number | null) => value !== null ? Math.round(value) : ""}
              fill="#ffffff"
              fontSize={11}
              fontWeight="bold"
            />
            {/* Volume acceleration labels (1.5x, 1.6x, etc.) - above bars */}
            <LabelList
              dataKey="accelLabel"
              position="top"
              offset={8}
              fill="#06b6d4"
              fontSize={10}
              fontWeight="bold"
            />
          </Bar>

          {/* Volume MA Line with label - dynamic based on selected period */}
          <Line
            xAxisId="bottom"
            yAxisId="volume"
            type="monotone"
            dataKey={maPeriod === 10 ? "volume_10ma" : "volume_20ma"}
            stroke="#60a5fa"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
            label={(props: { x: number; y: number; index: number }) => {
              // Only show label at first point - box to the left, line starts at right edge
              if (props.index !== 0) return null;
              const labelText = `Vol ${maPeriod}d MA`;
              const boxWidth = 68;
              return (
                <g key="vol-ma-label">
                  <rect
                    x={props.x - boxWidth}
                    y={props.y - 10}
                    width={boxWidth}
                    height={20}
                    rx={4}
                    fill="#eff6ff"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                  />
                  <text
                    x={props.x - boxWidth / 2}
                    y={props.y}
                    fill="#2563eb"
                    fontSize={10}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {labelText}
                  </text>
                </g>
              );
            }}
          />

          {/* Price Line - simple dots, gap badges rendered separately above bars */}
          <Line
            xAxisId="bottom"
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={(props: { cx: number; cy: number; index: number }) => {
              const isSignal = props.index === signalIdx;

              // Signal date - red circle
              if (isSignal) {
                return (
                  <circle
                    key={`dot-${props.index}`}
                    cx={props.cx}
                    cy={props.cy}
                    r={5}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                );
              }

              // Normal dot
              return <circle key={`dot-${props.index}`} cx={props.cx} cy={props.cy} r={2} fill="#3b82f6" />;
            }}
            activeDot={{ r: 4, fill: "#3b82f6", stroke: "#fff", strokeWidth: 1 }}
            label={(props: { x: number; y: number; index: number; value: number }) => {
              const d = chartData[props.index];
              if (!d) return null;

              // Gap badges - placed at fixed height above price line
              const gapPct = d.gap_pct;
              const gapY = props.y - 25; // Fixed offset above price point

              if (gapPct && gapPct > 1) {
                return (
                  <g key={`gap-badge-${props.index}`}>
                    <polygon
                      points={`${props.x},${gapY - 8} ${props.x - 6},${gapY + 4} ${props.x + 6},${gapY + 4}`}
                      fill="#22c55e"
                      stroke="#ffffff"
                      strokeWidth={1}
                    />
                    <text x={props.x} y={gapY - 12} fill="#22c55e" textAnchor="middle" fontSize={8} fontWeight="bold">
                      {gapPct > 0 ? `+${gapPct.toFixed(1)}%` : `${gapPct.toFixed(1)}%`}
                    </text>
                  </g>
                );
              }

              if (gapPct && gapPct < -1) {
                return (
                  <g key={`gap-badge-${props.index}`}>
                    <polygon
                      points={`${props.x},${gapY + 8} ${props.x - 6},${gapY - 4} ${props.x + 6},${gapY - 4}`}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={1}
                    />
                    <text x={props.x} y={gapY - 12} fill="#ef4444" textAnchor="middle" fontSize={8} fontWeight="bold">
                      {gapPct.toFixed(1)}%
                    </text>
                  </g>
                );
              }

              // Pattern annotation badge
              const annotation = d.patternAnnotation;
              if (annotation) {
                const labelY = props.y - 18;
                return (
                  <g key={`pattern-${props.index}`}>
                    <rect
                      x={props.x - 22}
                      y={labelY - 8}
                      width={44}
                      height={14}
                      rx={3}
                      fill={annotation.bg}
                      stroke={annotation.color}
                      strokeWidth={0.5}
                    />
                    <text x={props.x} y={labelY} fill={annotation.color} textAnchor="middle" fontSize={8} fontWeight="bold" dominantBaseline="middle">
                      {annotation.text}
                    </text>
                  </g>
                );
              }

              return null;
            }}
          />

          <ReferenceLine xAxisId="bottom" yAxisId="volume" y={0} stroke="transparent" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* LEGEND ROW - compact */}
      <div className="flex items-center justify-center gap-4 pt-1 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
          <span>Close</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span>Signal</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-green-500">▲</span>
          <span>Gap↑</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-red-500">▼</span>
          <span>Gap↓</span>
        </div>
      </div>
    </div>
  );
}

// Main component with toggle
export function PriceVolumeChart({
  data,
  height = 400,
  defaultMode = "line",
}: PriceVolumeChartProps) {
  const [mode, setMode] = useState<ChartMode>(defaultMode);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-card rounded-lg">
        <p className="text-muted-foreground">No chart data available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setMode("line")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === "line"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📊 Analysis
          </button>
          <button
            onClick={() => setMode("candle")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === "candle"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🕯️ Candles
          </button>
        </div>
        <div className="text-xs text-muted-foreground">
          {mode === "line" ? "Volume analysis with signals" : "OHLC candlesticks"}
        </div>
      </div>

      {mode === "line" ? (
        <LineChart data={data} height={height} />
      ) : (
        <CandlestickChart data={data} height={height} />
      )}
    </div>
  );
}
