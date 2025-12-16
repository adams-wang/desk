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
} from "recharts";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

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

interface SectorRotationChartProps {
  history: SectorHistoryDay[];
  height?: number;
  autoPlay?: boolean;
  intervalMs?: number;
}

export function SectorRotationChart({
  history,
  height = 450,
  autoPlay = false,
  intervalMs = 1500,
}: SectorRotationChartProps) {
  const [currentDayIndex, setCurrentDayIndex] = useState(history.length - 1);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1);

  // Auto-play logic
  useEffect(() => {
    if (!isPlaying || history.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentDayIndex((prev) => {
        if (prev >= history.length - 1) {
          // Loop back to start
          return 0;
        }
        return prev + 1;
      });
    }, intervalMs / speed);

    return () => clearInterval(interval);
  }, [isPlaying, history.length, intervalMs, speed]);

  // Reset to latest when history changes
  useEffect(() => {
    setCurrentDayIndex(history.length - 1);
  }, [history.length]);

  const currentDay = history[currentDayIndex];

  // Transform data for chart - sort by MRS_20 descending (best at top)
  const chartData = useMemo(() => {
    if (!currentDay?.sectors) return [];

    // Sort by MRS_20 descending for display
    const sorted = [...currentDay.sectors].sort((a, b) => (b.mrs_20 ?? 0) - (a.mrs_20 ?? 0));

    return sorted.map((s, idx) => ({
      name: s.sector_name,
      etf: s.etf_ticker,
      mrs_20: s.mrs_20 ?? 0, // Already in percentage form in DB
      mrs_5: s.mrs_5 ?? 0,
      rank: idx + 1,
    }));
  }, [currentDay]);

  // Calculate domain for consistent axis across animation
  const domain = useMemo(() => {
    let min = 0;
    let max = 0;
    history.forEach((day) => {
      day.sectors.forEach((s) => {
        const mrs20 = s.mrs_20 ?? 0;
        const mrs5 = s.mrs_5 ?? 0;
        min = Math.min(min, mrs20, mrs5);
        max = Math.max(max, mrs20, mrs5);
      });
    });
    // Add padding
    return [Math.floor(min - 1), Math.ceil(max + 1)];
  }, [history]);

  const handlePrevDay = useCallback(() => {
    setCurrentDayIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextDay = useCallback(() => {
    setCurrentDayIndex((prev) => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  if (!history || history.length === 0) {
    return (
      <div className="flex items-center justify-center h-[450px] bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">No sector data available</p>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: (typeof chartData)[0] }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-muted-foreground">ETF: {data.etf}</p>
          <p className="text-blue-400">MRS 20: {data.mrs_20.toFixed(2)}%</p>
          <p className="text-orange-400">MRS 5: {data.mrs_5.toFixed(2)}%</p>
          <p className="text-muted-foreground">Rank: #{data.rank}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            disabled={currentDayIndex === 0}
            className="p-2 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous day"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlay}
            className="p-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={handleNextDay}
            disabled={currentDayIndex === history.length - 1}
            className="p-2 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next day"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Date indicator */}
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono">
            <span className="text-muted-foreground">Date: </span>
            <span className="font-bold text-foreground">{currentDay?.date}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Day {currentDayIndex + 1} of {history.length}
          </div>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Speed:</span>
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded transition-colors ${
                speed === s
                  ? "bg-blue-500 text-white"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-1">
        {history.map((day, idx) => (
          <button
            key={day.date}
            onClick={() => setCurrentDayIndex(idx)}
            className={`flex-1 h-2 rounded-full transition-all ${
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

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          layout="vertical"
          data={chartData}
          margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" strokeOpacity={0.5} horizontal={false} />
          <XAxis
            type="number"
            className="text-muted-foreground"
            fontSize={11}
            tickFormatter={(v) => `${v}%`}
            domain={domain}
          />
          <YAxis
            type="category"
            dataKey="name"
            className="text-muted-foreground"
            fontSize={11}
            width={115}
            tick={({ x, y, payload }) => {
              const item = chartData.find((d) => d.name === payload.value);
              return (
                <g transform={`translate(${x},${y})`}>
                  <text x={-5} y={0} textAnchor="end" fill="currentColor" fontSize={11} dominantBaseline="middle">
                    {payload.value}
                  </text>
                  <text x={-5} y={12} textAnchor="end" fill="#9ca3af" fontSize={9} dominantBaseline="middle">
                    ({item?.etf})
                  </text>
                </g>
              );
            }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Reference lines */}
          <ReferenceLine x={0} stroke="#6b7280" strokeWidth={1.5} />
          <ReferenceLine x={4} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "Strong", position: "top", fill: "#22c55e", fontSize: 10 }} />
          <ReferenceLine x={-4} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "Weak", position: "top", fill: "#ef4444", fontSize: 10 }} />
          <ReferenceLine x={-2} stroke="#6b7280" strokeDasharray="3 3" strokeOpacity={0.3} />
          <ReferenceLine x={3} stroke="#6b7280" strokeDasharray="3 3" strokeOpacity={0.3} />

          {/* MRS 20 bars */}
          <Bar dataKey="mrs_20" name="MRS 20" radius={[0, 4, 4, 0]} maxBarSize={24} animationDuration={300}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.mrs_20 >= 0 ? "#3b82f6" : "#6366f1"}
              />
            ))}
          </Bar>

          {/* MRS 5 line (momentum) */}
          <Line
            type="monotone"
            dataKey="mrs_5"
            name="MRS 5"
            stroke="#f97316"
            strokeWidth={2.5}
            dot={{ fill: "#f97316", r: 5, strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 7, stroke: "#f97316", strokeWidth: 2 }}
            animationDuration={300}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-blue-500"></span>
          <span>MRS 20 (Ranked)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          <span>MRS 5 (Momentum)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-green-500"></span>
          <span>Strong (4%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-red-500"></span>
          <span>Weak (-4%)</span>
        </div>
      </div>

      {/* Info text */}
      <p className="text-center text-xs text-muted-foreground">
        Sector ETF MRS - Higher = Stronger | MRS 20 ranges: &lt;-4% weak | -2% ~ 3% normal | &gt;4% strong
      </p>
    </div>
  );
}
