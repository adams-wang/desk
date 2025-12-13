"use client";

import {
  BarChart,
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
      <div className="flex items-center justify-center h-[300px] bg-zinc-900 rounded-lg">
        <p className="text-zinc-500">No sector data available</p>
      </div>
    );
  }

  // Transform data for chart - already sorted by MRS_20 ASC from API
  const chartData = sectors.map((s) => ({
    name: s.sector_name,
    etf: s.etf_ticker,
    mrs_20: s.mrs_20 ?? 0,
    mrs_5: s.mrs_5 ?? 0,
    isCurrent: s.sector_name === currentSector,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-white">{data.name}</p>
          <p className="text-zinc-400 text-sm">ETF: {data.etf}</p>
          <p className="text-blue-400">MRS 20: {data.mrs_20.toFixed(2)}%</p>
          <p className="text-orange-400">MRS 5: {data.mrs_5.toFixed(2)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          layout="vertical"
          data={chartData}
          margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis
            type="number"
            stroke="#9ca3af"
            fontSize={12}
            tickFormatter={(v) => `${v}%`}
            domain={["dataMin - 1", "dataMax + 1"]}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#9ca3af"
            fontSize={11}
            width={95}
            tick={({ x, y, payload }) => {
              const item = chartData.find((d) => d.name === payload.value);
              const isCurrent = item?.isCurrent;
              return (
                <g transform={`translate(${x},${y})`}>
                  {isCurrent && (
                    <text x={-100} y={4} fill="#ef4444" fontSize={14} fontWeight="bold">
                      *
                    </text>
                  )}
                  <text
                    x={-5}
                    y={4}
                    textAnchor="end"
                    fill={isCurrent ? "#ef4444" : "#9ca3af"}
                    fontSize={11}
                    fontWeight={isCurrent ? "bold" : "normal"}
                  >
                    {payload.value}
                  </text>
                </g>
              );
            }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Reference lines */}
          <ReferenceLine x={0} stroke="#6b7280" strokeWidth={1.5} />
          <ReferenceLine x={4} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine x={-4} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine x={3} stroke="#6b7280" strokeDasharray="3 3" strokeOpacity={0.3} />
          <ReferenceLine x={-2} stroke="#6b7280" strokeDasharray="3 3" strokeOpacity={0.3} />

          {/* MRS 20 bars */}
          <Bar dataKey="mrs_20" name="MRS 20" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isCurrent ? "#3b82f6" : "#4f46e5"}
                stroke={entry.isCurrent ? "#ef4444" : "none"}
                strokeWidth={entry.isCurrent ? 2 : 0}
              />
            ))}
          </Bar>

          {/* MRS 5 line */}
          <Line
            type="monotone"
            dataKey="mrs_5"
            name="MRS 5"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ fill: "#f97316", r: 4, strokeWidth: 1, stroke: "#0a0a0a" }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-indigo-600"></span>
          <span>MRS 20</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          <span>MRS 5</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-green-500"></span>
          <span>Strong (4%)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-red-500"></span>
          <span>Weak (-4%)</span>
        </div>
      </div>
    </div>
  );
}
