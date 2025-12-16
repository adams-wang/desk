"use client";

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

interface SectorData {
  sector_name: string;
  etf_ticker: string;
  mrs_5: number | null;
  mrs_20: number | null;
  close: number | null;
}

interface SectorMRSChartProps {
  sectors: SectorData[];
  currentSector: string | null;
  height?: number;
}

export function SectorMRSChart({ sectors, currentSector, height = 300 }: SectorMRSChartProps) {
  if (!sectors || sectors.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">No sector data available</p>
      </div>
    );
  }

  // Transform and sort data - DESCENDING by MRS_20 (strongest at top)
  const chartData = [...sectors]
    .sort((a, b) => (b.mrs_20 ?? 0) - (a.mrs_20 ?? 0))
    .map((s) => ({
      name: s.sector_name,
      etf: s.etf_ticker,
      mrs_20: s.mrs_20 ?? 0,
      mrs_5: s.mrs_5 ?? 0,
      isCurrent: s.sector_name === currentSector,
      // Label for bar end: "MRS20 MRS5 (ETF)"
      barLabel: `${(s.mrs_20 ?? 0).toFixed(1)} (${s.etf_ticker})`,
    }));

  // Calculate domain - centered on 0 with padding
  const allValues = chartData.flatMap((d) => [d.mrs_20, d.mrs_5]);
  const maxAbs = Math.max(Math.abs(Math.min(...allValues)), Math.abs(Math.max(...allValues)), 5);
  const domainPadding = Math.ceil(maxAbs) + 1;
  const domain = [-domainPadding, domainPadding];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-muted-foreground">ETF: {data.etf}</p>
          <p className="text-blue-400">MRS 20: {data.mrs_20.toFixed(2)}%</p>
          <p className="text-orange-400">MRS 5: {data.mrs_5.toFixed(2)}%</p>
        </div>
      );
    }
    return null;
  };

  // Custom bar label renderer
  const renderBarLabel = (props: { x?: number; y?: number; width?: number; height?: number; value?: string; index?: number }) => {
    const { x, y, width, height, value, index } = props;
    if (x === undefined || y === undefined || width === undefined || height === undefined || index === undefined) return null;

    const data = chartData[index];
    const mrs20 = data.mrs_20;
    const isPositive = mrs20 >= 0;

    // Position label at end of bar (or at 0 line if bar is very small)
    const labelX = isPositive ? x + width + 4 : x - 4;
    const textAnchor = isPositive ? "start" : "end";

    return (
      <text
        x={labelX}
        y={y + (height || 0) / 2}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fontSize={9}
        fill="#9ca3af"
        fontFamily="monospace"
      >
        {data.mrs_20.toFixed(1)} ({data.etf})
      </text>
    );
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          layout="vertical"
          data={chartData}
          margin={{ top: 10, right: 70, left: 5, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" strokeOpacity={0.5} horizontal={false} />

          <XAxis
            type="number"
            className="text-muted-foreground"
            fontSize={11}
            tickFormatter={(v) => `${v}%`}
            domain={domain}
            ticks={[-4, -2, 0, 2, 4]}
          />

          <YAxis
            type="category"
            dataKey="name"
            className="text-muted-foreground"
            fontSize={10}
            width={110}
            tick={({ x, y, payload }) => {
              const item = chartData.find((d) => d.name === payload.value);
              const isCurrent = item?.isCurrent;
              return (
                <g transform={`translate(${x},${y})`}>
                  {isCurrent && (
                    <text x={-105} y={4} fill="#ef4444" fontSize={12}>
                      ★
                    </text>
                  )}
                  <text
                    x={-5}
                    y={4}
                    textAnchor="end"
                    fill={isCurrent ? "#ef4444" : "currentColor"}
                    fontSize={10}
                    fontWeight={isCurrent ? "bold" : "normal"}
                  >
                    {payload.value}
                  </text>
                </g>
              );
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Zone backgrounds - subtle fills */}
          <ReferenceLine x={0} stroke="#6b7280" strokeWidth={1.5} />
          <ReferenceLine x={4} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.7} />
          <ReferenceLine x={-4} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.7} />
          <ReferenceLine x={3} stroke="#6b7280" strokeDasharray="3 3" strokeOpacity={0.3} />
          <ReferenceLine x={-2} stroke="#6b7280" strokeDasharray="3 3" strokeOpacity={0.3} />

          {/* MRS 20 bars */}
          <Bar dataKey="mrs_20" name="MRS 20" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isCurrent ? "#3b82f6" : "#6366f1"}
                stroke={entry.isCurrent ? "#ef4444" : "none"}
                strokeWidth={entry.isCurrent ? 2 : 0}
              />
            ))}
            <LabelList content={renderBarLabel} />
          </Bar>

          {/* MRS 5 line (momentum) */}
          <Line
            type="monotone"
            dataKey="mrs_5"
            name="MRS 5"
            stroke="#f97316"
            strokeWidth={2}
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const { cx, cy, index } = props;
              if (cx === undefined || cy === undefined || index === undefined) return <></>;
              const data = chartData[index];
              const isCurrent = data?.isCurrent;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isCurrent ? 6 : 4}
                  fill="#f97316"
                  stroke={isCurrent ? "#ef4444" : "#fff"}
                  strokeWidth={isCurrent ? 2 : 1}
                />
              );
            }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-indigo-500"></span>
          <span>MRS 20</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          <span>MRS 5</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-green-500"></span>
          <span>Strong (4%)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-red-500"></span>
          <span>Weak (-4%)</span>
        </div>
      </div>
    </div>
  );
}
