"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

interface MRSData {
  date: string;
  mrs_5: number | null;
  mrs_10: number | null;
  mrs_20: number | null;
}

interface MRSTrajectoryChartProps {
  data: MRSData[];
  height?: number;
}

export function MRSTrajectoryChart({ data, height = 300 }: MRSTrajectoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-zinc-900 rounded-lg">
        <p className="text-zinc-500">No MRS history available</p>
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD format
    fullDate: d.date,
    mrs_5: d.mrs_5 ?? 0,
    mrs_10: d.mrs_10 ?? 0,
    mrs_20: d.mrs_20 ?? 0,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      const item = chartData.find((d) => d.date === label);
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-white mb-1">{item?.fullDate}</p>
          {payload.map((p) => (
            <p key={p.dataKey} style={{ color: p.color }}>
              {p.dataKey.toUpperCase().replace("_", " ")}: {p.value.toFixed(2)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Find min/max for y-axis domain
  const allValues = chartData.flatMap((d) => [d.mrs_5, d.mrs_10, d.mrs_20]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const yMin = Math.floor(minVal - 1);
  const yMax = Math.ceil(maxVal + 1);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            fontSize={11}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={11}
            tickFormatter={(v) => `${v}%`}
            domain={[yMin, yMax]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
            formatter={(value) => value.toUpperCase().replace("_", " ")}
          />

          {/* Reference lines for entry zones */}
          <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1} />
          <ReferenceLine
            y={3}
            stroke="#22c55e"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
            label={{ value: "MRS10 Entry", position: "right", fill: "#22c55e", fontSize: 10 }}
          />
          <ReferenceLine
            y={4}
            stroke="#3b82f6"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={{ value: "MRS20 Entry", position: "right", fill: "#3b82f6", fontSize: 10 }}
          />
          <ReferenceLine
            y={8.5}
            stroke="#f97316"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={{ value: "Exhaustion", position: "right", fill: "#f97316", fontSize: 10 }}
          />

          {/* MRS lines */}
          <Line
            type="monotone"
            dataKey="mrs_5"
            name="mrs_5"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="mrs_10"
            name="mrs_10"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#22c55e" }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="mrs_20"
            name="mrs_20"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#3b82f6", strokeWidth: 1, stroke: "#0a0a0a" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-2 text-xs text-zinc-500 space-y-1">
        <p>
          <span className="text-green-500">MRS 10 Entry:</span> 3-5% |
          <span className="text-blue-500 ml-2">MRS 20 Entry:</span> 4-8.5% |
          <span className="text-orange-500 ml-2">Exhaustion:</span> &gt;8.5%
        </p>
      </div>
    </div>
  );
}
