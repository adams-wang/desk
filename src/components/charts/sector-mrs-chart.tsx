"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Line,
  ComposedChart,
  LabelList,
} from "recharts";
import { Play, Pause, RotateCcw } from "lucide-react";

interface SectorData {
  sector_name: string;
  etf_ticker: string;
  mrs_5: number | null;
  mrs_20: number | null;
  close: number | null;
}

interface SectorHistoryDay {
  date: string;
  sectors: SectorData[];
}

interface SectorMRSChartProps {
  history: SectorHistoryDay[];
  currentSector: string | null;
  height?: number;
  intervalMs?: number;
  showControls?: boolean; // Hide playback controls for static view
}

export function SectorMRSChart({ history, currentSector, height = 380, intervalMs = 1200, showControls = true }: SectorMRSChartProps) {
  const [currentDayIndex, setCurrentDayIndex] = useState(history.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play logic - plays from start to current position
  useEffect(() => {
    if (!isPlaying || history.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentDayIndex((prev) => {
        if (prev >= history.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, history.length, intervalMs]);

  // Reset to latest day when history changes
  useEffect(() => {
    setCurrentDayIndex(history.length - 1);
    setIsPlaying(false);
  }, [history.length]);

  const currentDay = history[currentDayIndex];

  const togglePlay = useCallback(() => {
    if (currentDayIndex >= history.length - 1) {
      // Restart from beginning
      setCurrentDayIndex(0);
    }
    setIsPlaying((prev) => !prev);
  }, [currentDayIndex, history.length]);

  const handleRestart = useCallback(() => {
    setCurrentDayIndex(history.length - 1);
    setIsPlaying(false);
  }, [history.length]);

  if (!history || history.length === 0 || !currentDay?.sectors) {
    return (
      <div className="flex items-center justify-center h-[380px] bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">No sector data available</p>
      </div>
    );
  }

  // Transform and sort data - DESCENDING by MRS_20 (strongest at top)
  const chartData = [...currentDay.sectors]
    .sort((a, b) => (b.mrs_20 ?? 0) - (a.mrs_20 ?? 0))
    .map((s) => ({
      name: s.sector_name,
      etf: s.etf_ticker,
      mrs_20: s.mrs_20 ?? 0,
      mrs_5: s.mrs_5 ?? 0,
      isCurrent: s.sector_name === currentSector,
    }));

  // Fixed domain centered on 0
  const domain = [-6, 6];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card/75 backdrop-blur-md border border-border rounded-lg p-3 shadow-lg text-sm">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-muted-foreground">ETF: {data.etf}</p>
          <p className="text-blue-400">MRS 20: {data.mrs_20.toFixed(2)}%</p>
          <p className="text-orange-400">MRS 5: {data.mrs_5.toFixed(2)}%</p>
        </div>
      );
    }
    return null;
  };

  // Get bar color based on MRS value - normal range is -2% to +3%
  const getBarColor = (mrs20: number, isCurrent: boolean): string => {
    if (isCurrent) return "#3b82f6"; // Blue for current sector
    if (mrs20 > 3) return "#16a34a"; // Strong green (above normal)
    if (mrs20 >= 0) return "#22c55e"; // Positive normal (green)
    if (mrs20 >= -2) return "#f87171"; // Negative normal (light coral)
    return "#dc2626"; // Weak (below normal - red)
  };

  // Custom bar label renderer - show value and ETF at end of bar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderBarLabel = (props: any) => {
    const { x, y, width, height, index } = props;
    if (x === undefined || y === undefined || width === undefined || height === undefined || index === undefined) return null;

    const data = chartData[index];
    const mrs20 = data.mrs_20;
    const isPositive = mrs20 >= 0;

    // Position label outside the bar - right for positive, left for negative
    const labelX = isPositive ? x + width + 5 : x - 5;
    const textAnchor = isPositive ? "start" : "end";

    return (
      <text
        x={labelX}
        y={y + (height || 0) / 2}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fontSize={11}
        fill="#1f2937"
        fontFamily="ui-monospace, monospace"
        fontWeight={600}
        style={isPositive ? {} : { textShadow: "0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff" }}
      >
        {mrs20.toFixed(1)} ({data.etf})
      </text>
    );
  };

  return (
    <div className="w-full space-y-3">
      {/* Controls - only show when showControls is true */}
      {showControls && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleRestart}
                className="p-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Date indicator */}
            <div className="text-xs font-mono">
              <span className="text-muted-foreground">{currentDay.date}</span>
              <span className="text-muted-foreground/60 ml-2">
                ({currentDayIndex + 1}/{history.length})
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex items-center gap-0.5">
            {history.map((day, idx) => (
              <button
                key={day.date}
                onClick={() => {
                  setCurrentDayIndex(idx);
                  setIsPlaying(false);
                }}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  idx === currentDayIndex
                    ? "bg-blue-500"
                    : idx < currentDayIndex
                    ? "bg-blue-500/50"
                    : "bg-muted"
                }`}
                title={day.date}
              />
            ))}
          </div>
        </>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          layout="vertical"
          data={chartData}
          margin={{ top: 5, right: 80, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" strokeOpacity={0.3} horizontal={false} />

          <XAxis
            type="number"
            fontSize={11}
            tickFormatter={(v) => `${v}%`}
            domain={domain}
            ticks={[-4, -2, 0, 2, 4]}
            tick={{ fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            type="category"
            dataKey="name"
            fontSize={13}
            width={165}
            axisLine={false}
            tickLine={false}
            interval={0}
            tick={({ x, y, payload }) => {
              const item = chartData.find((d) => d.name === payload.value);
              const isCurrent = item?.isCurrent;
              return (
                <g transform={`translate(${x},${y})`}>
                  {isCurrent && (
                    <text x={-158} y={4} fill="#ef4444" fontSize={15} fontWeight="bold">
                      ★
                    </text>
                  )}
                  <text
                    x={-5}
                    y={4}
                    textAnchor="end"
                    fill={isCurrent ? "#ef4444" : "var(--color-muted-foreground)"}
                    fontSize={13}
                    fontWeight={isCurrent ? 700 : 500}
                  >
                    {payload.value}
                  </text>
                </g>
              );
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Reference lines for zones: normal range -2% to +3%, strong/weak at ±4% */}
          <ReferenceLine x={0} stroke="var(--color-muted-foreground)" strokeWidth={1} strokeOpacity={0.5} />
          <ReferenceLine x={4} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.8} />
          <ReferenceLine x={-4} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.8} />
          <ReferenceLine x={3} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine x={-2} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" strokeOpacity={0.4} />

          {/* 20D Strength bars - green for positive, red for negative, blue for current */}
          <Bar dataKey="mrs_20" name="20D Strength" radius={[0, 3, 3, 0]} maxBarSize={22} animationDuration={400}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.mrs_20, entry.isCurrent)}
              />
            ))}
            <LabelList content={renderBarLabel} />
          </Bar>

          {/* 5D Strength line (momentum) - orange for contrast */}
          <Line
            type="monotone"
            dataKey="mrs_5"
            name="5D Strength"
            stroke="#f97316"
            strokeWidth={2.5}
            animationDuration={400}
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const { cx, cy, index } = props;
              if (cx === undefined || cy === undefined || index === undefined) return <></>;
              const data = chartData[index];
              const isCurrent = data?.isCurrent;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isCurrent ? 7 : 5}
                  fill="#f97316"
                  stroke={isCurrent ? "#ef4444" : "#fff"}
                  strokeWidth={isCurrent ? 2.5 : 1.5}
                />
              );
            }}
            activeDot={{ r: 7 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-green-500"></span>
          <span>MRS 20 (bar)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-green-600"></span>
          <span>Strong (±4%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-[1px] bg-muted-foreground/50"></span>
          <span>Normal (-2~+3%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          <span>MRS 5 (normal: -1~+1%)</span>
        </div>
      </div>
    </div>
  );
}
