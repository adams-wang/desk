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

export function SectorMRSChart({ sectors, currentSector, height = 380 }: SectorMRSChartProps) {
  if (!sectors || sectors.length === 0) {
    return (
      <div className="flex items-center justify-center h-[380px] bg-muted/50 rounded-lg">
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
    }));

  // Fixed domain centered on 0
  const domain = [-6, 6];

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

  // Custom bar label renderer - show value and ETF at end of bar
  const renderBarLabel = (props: { x?: number; y?: number; width?: number; height?: number; index?: number }) => {
    const { x, y, width, height, index } = props;
    if (x === undefined || y === undefined || width === undefined || height === undefined || index === undefined) return null;

    const data = chartData[index];
    const mrs20 = data.mrs_20;
    const isPositive = mrs20 >= 0;

    // Position label at end of bar
    const labelX = isPositive ? x + width + 5 : x - 5;
    const textAnchor = isPositive ? "start" : "end";

    return (
      <text
        x={labelX}
        y={y + (height || 0) / 2}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fontSize={10}
        fill="var(--color-muted-foreground)"
        fontFamily="ui-monospace, monospace"
        fontWeight={500}
      >
        {mrs20.toFixed(1)} ({data.etf})
      </text>
    );
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          layout="vertical"
          data={chartData}
          margin={{ top: 5, right: 75, left: 5, bottom: 5 }}
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
            fontSize={11}
            width={145}
            axisLine={false}
            tickLine={false}
            interval={0}
            tick={({ x, y, payload }) => {
              const item = chartData.find((d) => d.name === payload.value);
              const isCurrent = item?.isCurrent;
              return (
                <g transform={`translate(${x},${y})`}>
                  {isCurrent && (
                    <text x={-135} y={4} fill="#ef4444" fontSize={14} fontWeight="bold">
                      ★
                    </text>
                  )}
                  <text
                    x={-5}
                    y={4}
                    textAnchor="end"
                    fill={isCurrent ? "#ef4444" : "var(--color-foreground)"}
                    fontSize={11}
                    fontWeight={isCurrent ? 600 : 400}
                  >
                    {payload.value}
                  </text>
                </g>
              );
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Reference lines for zones */}
          <ReferenceLine x={0} stroke="var(--color-muted-foreground)" strokeWidth={1} strokeOpacity={0.5} />
          <ReferenceLine x={4} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.8} />
          <ReferenceLine x={-4} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.8} />
          <ReferenceLine x={-2} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" strokeOpacity={0.3} />
          <ReferenceLine x={2} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" strokeOpacity={0.3} />

          {/* MRS 20 bars - blue theme matching app style */}
          <Bar dataKey="mrs_20" name="MRS 20" radius={[0, 3, 3, 0]} maxBarSize={20}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isCurrent ? "#3b82f6" : "#60a5fa"}
                stroke={entry.isCurrent ? "#ef4444" : "none"}
                strokeWidth={entry.isCurrent ? 2 : 0}
              />
            ))}
            <LabelList content={renderBarLabel} />
          </Bar>

          {/* MRS 5 line (momentum) - orange for contrast */}
          <Line
            type="monotone"
            dataKey="mrs_5"
            name="MRS 5"
            stroke="#f97316"
            strokeWidth={2.5}
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
          <span className="w-3 h-3 rounded bg-blue-400"></span>
          <span>MRS 20</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          <span>MRS 5</span>
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
    </div>
  );
}
