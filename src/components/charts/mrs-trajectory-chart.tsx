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
} from "recharts";

interface MRSData {
  date: string;
  mrs_5: number | null;
  mrs_10: number | null;
  mrs_20: number | null;
}

interface NASDAQData {
  date: string;
  close: number;
  pct_change: number;
}

interface MRSTrajectoryChartProps {
  data: MRSData[];
  nasdaqData?: NASDAQData[];
  height?: number;
  currentRange?: number;
}

export function MRSTrajectoryChart({ data, nasdaqData = [], height = 350, currentRange = 20 }: MRSTrajectoryChartProps) {
  // Compact view for 2M (40) or 3M (60) ranges - show vertical dates
  const isCompactView = currentRange >= 40;
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">No MRS history available</p>
      </div>
    );
  }

  // Transform data for chart - merge MRS and NASDAQ by date
  const nasdaqMap = new Map(nasdaqData.map(d => [d.date, d.pct_change]));

  const chartData = data.map((d, idx) => ({
    date: d.date.slice(5), // MM-DD format
    fullDate: d.date,
    mrs_5: d.mrs_5 ?? 0,
    mrs_10: d.mrs_10 ?? 0,
    mrs_20: d.mrs_20 ?? 0,
    nasdaq: nasdaqMap.get(d.date) ?? null,
    isLast: idx === data.length - 1,
  }));

  // Custom tooltip - positioned above lines
  const CustomTooltip = ({
    active,
    payload,
    label,
    coordinate
  }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; color: string }>;
    label?: string;
    coordinate?: { x: number; y: number };
  }) => {
    if (active && payload && payload.length && coordinate) {
      const item = chartData.find((d) => d.date === label);
      return (
        <div
          className="bg-card/75 backdrop-blur-md border border-border rounded-lg p-3 shadow-lg text-sm absolute pointer-events-none z-50 whitespace-nowrap"
          style={{
            left: coordinate.x,
            top: coordinate.y - 50,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          <p className="font-semibold text-foreground mb-2">{item?.fullDate}</p>
          <div className="space-y-1">
            {payload.map((p) => {
              const name = p.dataKey === "nasdaq"
                ? "NASDAQ"
                : p.dataKey === "mrs_5"
                  ? "5D Strength"
                  : p.dataKey === "mrs_10"
                    ? "10D Strength"
                    : "20D Strength";
              return (
                <div key={p.dataKey} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-muted-foreground">{name}:</span>
                  <span className="font-mono font-medium" style={{ color: p.color }}>
                    {p.value?.toFixed(2) ?? "-"}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Find min/max for MRS y-axis domain
  const mrsValues = chartData.flatMap((d) => [d.mrs_5, d.mrs_10, d.mrs_20]);
  const minMRS = Math.min(...mrsValues, -2);
  const maxMRS = Math.max(...mrsValues, 9);
  const yMinMRS = Math.floor(minMRS - 1);
  const yMaxMRS = Math.ceil(maxMRS + 1);

  // Find min/max for NASDAQ y-axis domain
  const nasdaqValues = chartData.map(d => d.nasdaq).filter((v): v is number => v !== null);
  const minNASDAQ = nasdaqValues.length > 0 ? Math.min(...nasdaqValues) : -5;
  const maxNASDAQ = nasdaqValues.length > 0 ? Math.max(...nasdaqValues) : 5;
  const yMinNASDAQ = Math.floor(minNASDAQ - 1);
  const yMaxNASDAQ = Math.ceil(maxNASDAQ + 1);

  // Compute unique ticks for NASDAQ axis to avoid duplicate key errors
  const nasdaqTicks = [...new Set([yMinNASDAQ, -4, 0, 2, yMaxNASDAQ])].sort((a, b) => a - b);

  return (
    <div className="w-full space-y-3">
      {/* Legend - top aligned */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle cx="6" cy="6" r="5" fill="#f97316" stroke="#fff" strokeWidth="1" />
            </svg>
            <span className="text-muted-foreground">MRS 5</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <polygon points="6,1 11,10 1,10" fill="#22c55e" stroke="#fff" strokeWidth="1" />
            </svg>
            <span className="text-muted-foreground">MRS 10</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="1" y="1" width="10" height="10" fill="#3b82f6" stroke="#fff" strokeWidth="1" />
            </svg>
            <span className="text-muted-foreground">MRS 20</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: "#9ca3af" }} />
            <span className="text-muted-foreground">NASDAQ</span>
          </div>
        </div>
        <div className="text-muted-foreground">
          <span style={{ color: "#22c55e" }} className="font-medium">MRS 10</span> early: <span style={{ color: "#22c55e" }}>3~5%</span>
          <span className="mx-1.5">|</span>
          <span style={{ color: "#3b82f6" }} className="font-medium">MRS 20</span> confirm: <span style={{ color: "#3b82f6" }}>4~8.5%</span>
          <span className="mx-1.5">|</span>
          <span style={{ color: "#f97316" }} className="font-medium">&gt;8.5%</span> exhaustion
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 15, right: 0, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" strokeOpacity={0.3} />

          <XAxis
            dataKey="date"
            fontSize={isCompactView ? 10 : 11}
            interval={isCompactView ? 1 : 1}
            tick={isCompactView
              ? { fill: "var(--color-muted-foreground)", fontSize: 10, angle: -90, textAnchor: "end", dy: 4 }
              : { fill: "var(--color-muted-foreground)" }
            }
            axisLine={false}
            tickLine={false}
            padding={{ left: 15, right: 15 }}
            height={isCompactView ? 50 : 30}
          />

          {/* Left Y-axis for MRS */}
          <YAxis
            yAxisId="mrs"
            orientation="left"
            fontSize={11}
            tickFormatter={(v) => `${v}%`}
            domain={[yMinMRS, yMaxMRS]}
            tick={{ fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={45}
          />

          {/* Right Y-axis for NASDAQ */}
          <YAxis
            yAxisId="nasdaq"
            orientation="right"
            fontSize={11}
            tickFormatter={(v) => `${v}%`}
            domain={[yMinNASDAQ, yMaxNASDAQ]}
            ticks={nasdaqTicks}
            tick={{ fill: "#9ca3af", dx: 15 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />

          <Tooltip
            content={<CustomTooltip />}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 50, overflow: 'visible' }}
          />

          {/* Reference lines for entry zones */}
          <ReferenceLine yAxisId="mrs" y={0} stroke="var(--color-muted-foreground)" strokeWidth={1} strokeOpacity={0.5} />
          <ReferenceLine
            yAxisId="mrs"
            y={3}
            stroke="#22c55e"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={(props) => {
              const { viewBox } = props;
              const vb = viewBox as { x?: number; y?: number; width?: number };
              const x = (vb?.x ?? 0) - 42;
              const y = (vb?.y ?? 0);
              return (
                <g>
                  <rect x={x} y={y - 7} width={52} height={14} fill="#fff" stroke="#22c55e" strokeWidth={1} rx={2} />
                  <text x={x + 26} y={y + 4} textAnchor="middle" fill="#22c55e" fontSize={10} fontWeight={500}>Entry 3%</text>
                </g>
              );
            }}
          />
          <ReferenceLine
            yAxisId="mrs"
            y={4}
            stroke="#3b82f6"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={(props) => {
              const { viewBox } = props;
              const vb = viewBox as { x?: number; y?: number; width?: number };
              const centerX = (vb?.x ?? 0) + ((vb?.width ?? 0) / 2);
              const y = (vb?.y ?? 0);
              return (
                <g>
                  <rect x={centerX - 35} y={y - 7} width={70} height={14} fill="#fff" stroke="#3b82f6" strokeWidth={1} rx={2} />
                  <text x={centerX} y={y + 4} textAnchor="middle" fill="#3b82f6" fontSize={10} fontWeight={500}>Confirm 4%</text>
                </g>
              );
            }}
          />
          <ReferenceLine
            yAxisId="mrs"
            y={8.5}
            stroke="#f97316"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={(props) => {
              const { viewBox } = props;
              const vb = viewBox as { x?: number; y?: number; width?: number };
              const x = (vb?.x ?? 0) + (vb?.width ?? 0) - 45;
              const y = (vb?.y ?? 0);
              return (
                <g>
                  <rect x={x} y={y - 7} width={90} height={14} fill="#fff" stroke="#f97316" strokeWidth={1} rx={2} />
                  <text x={x + 45} y={y + 4} textAnchor="middle" fill="#f97316" fontSize={10} fontWeight={500}>Exhaustion 8.5%</text>
                </g>
              );
            }}
          />

          {/* NASDAQ line (right axis) - gray dashed */}
          {nasdaqValues.length > 0 && (
            <Line
              yAxisId="nasdaq"
              type="monotone"
              dataKey="nasdaq"
              name="NASDAQ"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          )}

          {/* 5D Strength - Orange with circles */}
          <Line
            yAxisId="mrs"
            type="monotone"
            dataKey="mrs_5"
            name="5D Strength"
            stroke="#f97316"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, index } = props;
              if (cx === undefined || cy === undefined) return null;
              const isLast = index === chartData.length - 1;
              if (isLast) {
                return <circle cx={cx} cy={cy} r={7} fill="#f97316" stroke="#fff" strokeWidth={1.5} />;
              }
              return <circle cx={cx} cy={cy} r={3} fill="#f97316" stroke="#fff" strokeWidth={1.5} />;
            }}
            activeDot={{ r: 5 }}
          />

          {/* 10D Strength - Green with triangles */}
          <Line
            yAxisId="mrs"
            type="monotone"
            dataKey="mrs_10"
            name="10D Strength"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={(props) => {
              const { cx, cy, index } = props;
              if (cx === undefined || cy === undefined) return null;
              const isLast = index === chartData.length - 1;
              const size = isLast ? 8 : 5;
              const fill = "#22c55e";
              const strokeColor = "#fff";
              const strokeW = isLast ? 1.5 : 1;
              return (
                <polygon
                  points={`${cx},${cy - size} ${cx - size},${cy + size * 0.6} ${cx + size},${cy + size * 0.6}`}
                  fill={fill}
                  stroke={strokeColor}
                  strokeWidth={strokeW}
                />
              );
            }}
            activeDot={{ r: 6 }}
          />

          {/* 20D Strength - Blue with squares */}
          <Line
            yAxisId="mrs"
            type="monotone"
            dataKey="mrs_20"
            name="20D Strength"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={(props) => {
              const { cx, cy, index } = props;
              if (cx === undefined || cy === undefined) return null;
              const isLast = index === chartData.length - 1;
              const size = isLast ? 7 : 4;
              const fill = "#3b82f6";
              const strokeColor = "#fff";
              const strokeW = isLast ? 1.5 : 1;
              return (
                <rect
                  x={cx - size}
                  y={cy - size}
                  width={size * 2}
                  height={size * 2}
                  fill={fill}
                  stroke={strokeColor}
                  strokeWidth={strokeW}
                />
              );
            }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
