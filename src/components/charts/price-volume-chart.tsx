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
} from "recharts";
import {
  createChart,
  IChartApi,
  CandlestickSeries,
  HistogramSeries,
  CandlestickData,
  HistogramData,
  Time,
} from "lightweight-charts";
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

// Candlestick Chart using TradingView Lightweight Charts
function CandlestickChart({
  data,
  height,
}: {
  data: OHLCVData[];
  height: number;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const isDark = document.documentElement.classList.contains("dark");
    const colors = isDark
      ? { background: "#0a0a0a", text: "#d1d5db", grid: "#1f2937", border: "#374151" }
      : { background: "#ffffff", text: "#374151", grid: "#e5e7eb", border: "#d1d5db" };

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: colors.background }, textColor: colors.text },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      width: chartContainerRef.current.clientWidth,
      height: height,
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border, timeVisible: true },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#6366f1",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    const candleData: CandlestickData<Time>[] = data.map((d) => ({
      time: d.date as Time, open: d.open, high: d.high, low: d.low, close: d.close,
    }));

    const volumeData: HistogramData<Time>[] = data.map((d) => {
      const isUp = d.close >= d.open;
      const percentile = d.volume_10_ts ?? 50;
      let color = percentile >= 75 ? (isUp ? "#166534" : "#991b1b")
        : percentile >= 25 ? (isUp ? "#22c55e" : "#ef4444") : "#6b7280";
      return { time: d.date as Time, value: d.volume, color };
    });

    candlestickSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [data, height]);

  return <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden" />;
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
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d, idx) => {
      const transformed = transformDataPoint(d, idx, data);
      // Add verdict code for XAxis
      const verdict = getVerdictCode(d.verdict_10, d.verdict_20);
      return {
        ...transformed,
        verdictCode: verdict.code,
      };
    });
  }, [data]);

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
      {/* TOP: Summary Bar */}
      <div className="flex items-center justify-between px-2 py-2 bg-muted/50 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-4">
          {signalData && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Vol:</span>
                <span style={{ color: signalData.volumeRegime.color }} className="font-bold">
                  {signalData.volumeRegime.regime}
                </span>
                <span className="text-muted-foreground">
                  ({signalData.volumePercentile?.toFixed(0) ?? "-"}%ile)
                </span>
              </div>
              {signalData.volume_10ma && signalData.volume_10ma > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Ratio:</span>
                  <span className="text-foreground font-bold">
                    {(signalData.volume / signalData.volume_10ma).toFixed(2)}x
                  </span>
                </div>
              )}
              {signalData.ofd_code && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Candle:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{signalData.ofd_code}</span>
                  {signalData.conclusion && (
                    <span className="text-foreground">→ {signalData.conclusion}</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {/* Bar Color Legend - compact */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-700 rounded-sm"></span>High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500/60 rounded-sm"></span>Normal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-gray-500 rounded-sm"></span>Low
          </span>
        </div>
      </div>

      {/* MAIN CHART with all labels using LabelList for perfect bar alignment */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 25, right: 50, left: 60, bottom: 40 }}>
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

              // Color based on verdict type
              let color = "#9ca3af"; // gray for A
              if (verdict.includes("B")) color = "#22c55e"; // green for BUY
              else if (verdict.includes("H") && !verdict.includes("A")) color = "#22c55e"; // green for H|H
              else if (verdict === "H|H") color = "#22c55e";

              return (
                <text x={x} y={y - 5} fill={color} textAnchor="middle" fontSize={10} fontWeight="bold">
                  {verdict}
                </text>
              );
            }}
            interval={0}
          />

          {/* Bottom XAxis for OFD codes */}
          <XAxis
            xAxisId="bottom"
            dataKey="ofd_code"
            orientation="bottom"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#d97706", fontSize: 9, fontWeight: "bold" }}
            interval={0}
          />

          {/* Second bottom XAxis for dates */}
          <XAxis
            xAxisId="dates"
            dataKey="dateLabel"
            orientation="bottom"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9ca3af", fontSize: 8, dy: 15 }}
            interval={0}
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

          {/* Volume Bars */}
          <Bar
            xAxisId="bottom"
            yAxisId="volume"
            dataKey="volume"
            barSize={24}
            radius={[2, 2, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.volumeColor}
                fillOpacity={entry.volumeAlpha + 0.2}
              />
            ))}
          </Bar>

          {/* Volume 10-day MA Line */}
          <Line
            xAxisId="bottom"
            yAxisId="volume"
            type="monotone"
            dataKey="volume_10ma"
            stroke="#60a5fa"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
          />

          {/* Price Line */}
          <Line
            xAxisId="bottom"
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={(props: { cx: number; cy: number; index: number }) => {
              if (props.index === signalIdx) {
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={6}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                );
              }
              return <circle cx={props.cx} cy={props.cy} r={2} fill="#3b82f6" />;
            }}
            activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
          />

          <ReferenceLine xAxisId="bottom" yAxisId="volume" y={0} stroke="transparent" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* LEGEND ROW */}
      <div className="flex items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-blue-500 rounded"></div>
          <span>Close</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-blue-400 rounded" style={{ borderStyle: "dashed" }}></div>
          <span>Vol 10d MA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
          <span>Signal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-green-500">▲</span>
          <span>Gap Up</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-500">▼</span>
          <span>Gap Down</span>
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
      <div className="flex items-center justify-between mb-2">
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
