"use client";

import { useMemo } from "react";
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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { IndexOHLCV, IndicesOHLCVHistory } from "@/lib/queries/market";

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isUp: boolean;
  sma20: number | null;
  sma50: number | null;
}


// Calculate SMA on the fly
function calculateSMA(data: IndexOHLCV[], period: number): (number | null)[] {
  return data.map((_, idx) => {
    if (idx < period - 1) return null;
    const sum = data.slice(idx - period + 1, idx + 1).reduce((acc, d) => acc + d.close, 0);
    return sum / period;
  });
}

// Custom tooltip positioned above candle - follows both X and Y
function IndexTooltip({
  active,
  payload,
  coordinate,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  coordinate?: { x: number; y: number };
}) {
  if (!active || !payload?.length || !coordinate) return null;

  const d = payload[0].payload;

  return (
    <div
      className="bg-card/75 backdrop-blur-md border border-border rounded-lg p-2 shadow-xl text-xs absolute pointer-events-none z-50 whitespace-nowrap"
      style={{
        left: coordinate.x,
        top: coordinate.y - 50,
        transform: 'translateX(-50%) translateY(-100%)',
      }}
    >
      <div className="font-semibold text-foreground mb-1">{d.date}</div>
      <div className="space-y-0.5 font-mono">
        <div className="flex gap-3">
          <span><span className="text-orange-400">O:</span> {d.open.toLocaleString()}</span>
          <span><span className="text-green-400">H:</span> {d.high.toLocaleString()}</span>
        </div>
        <div className="flex gap-3">
          <span><span className="text-red-400">L:</span> {d.low.toLocaleString()}</span>
          <span><span className="font-bold">C:</span> {d.close.toLocaleString()}</span>
        </div>
        {d.volume > 0 && <div><span className="text-muted-foreground">Vol:</span> <span className="text-cyan-400">{(d.volume / 1e9).toFixed(2)}B</span></div>}
        <div className="flex gap-3 text-muted-foreground">
          {d.sma20 != null && <span><span className="text-blue-400">SMA20:</span> {d.sma20.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>}
          {d.sma50 != null && <span><span className="text-purple-400">SMA50:</span> {d.sma50.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>}
        </div>
      </div>
    </div>
  );
}

interface IndexOHLCVChartProps {
  name: string;
  data: IndexOHLCV[];
  displayDays?: number; // How many days to display (use extra for SMA warm-up)
  height?: number;
}

function IndexOHLCVChart({ name, data, displayDays = 42, height = 200 }: IndexOHLCVChartProps) {
  const chartData = useMemo(() => {
    // Calculate SMAs on ALL data (including warm-up period)
    const sma20Values = calculateSMA(data, 20);
    const sma50Values = calculateSMA(data, 50);

    const allData = data.map((d, idx) => ({
      ...d,
      dateLabel: d.date.slice(5), // MM-DD
      isUp: d.close >= d.open,
      sma20: sma20Values[idx],
      sma50: sma50Values[idx],
    }));

    // Only display the last N days (SMAs will be pre-calculated from warm-up)
    return allData.slice(-displayDays);
  }, [data, displayDays]);

  // Calculate price range for Y axis (use displayed data only)
  const priceMin = Math.min(...chartData.map((d) => d.low));
  const priceMax = Math.max(...chartData.map((d) => d.high));
  const priceRange = priceMax - priceMin;
  const pricePadding = priceRange * 0.1;
  const priceDomain: [number, number] = [priceMin - pricePadding, priceMax + pricePadding];
  const volumeMax = Math.max(...chartData.map((d) => d.volume));

  // Get latest data for header display
  const latest = chartData[chartData.length - 1];
  const prev = chartData.length > 1 ? chartData[chartData.length - 2] : null;
  const change = prev ? latest.close - prev.close : 0;
  const changePct = prev ? (change / prev.close) * 100 : 0;
  const isPositive = change >= 0;

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground text-sm">No data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-0 pt-1.5 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{name}</CardTitle>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="font-bold">{latest.close.toLocaleString()}</span>
            <span className={cn(isPositive ? "text-emerald-500" : "text-red-500")}>
              {isPositive ? "+" : ""}{changePct.toFixed(2)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {/* Candlestick Chart - 65% */}
        <ResponsiveContainer width="100%" height={height * 0.65}>
          <ComposedChart data={chartData} margin={{ top: 0, right: 5, left: 5, bottom: 0 }} syncId={`index-${name}`}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" strokeOpacity={0.3} />

            <XAxis
              dataKey="dateLabel"
              axisLine={false}
              tickLine={false}
              tick={false}
            />

            <YAxis
              yAxisId="price"
              domain={priceDomain}
              allowDataOverflow={true}
              className="text-muted-foreground"
              fontSize={9}
              width={40}
              tickFormatter={(v) => v.toLocaleString()}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              content={<IndexTooltip />}
              cursor={false}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ zIndex: 50, overflow: 'visible' }}
            />

            {/* Candlesticks - using Bar with custom shape */}
            <Bar
              yAxisId="price"
              dataKey={(d: ChartDataPoint) => [Math.min(d.open, d.close), Math.max(d.open, d.close)]}
              barSize={8}
              shape={(props: any) => {
                const { x, y, width, height: h, payload } = props;
                if (!payload || !x || !width) return <></>;

                const { open, high, low, close, isUp } = payload;
                const color = isUp ? "#22c55e" : "#ef4444";
                const centerX = x + width / 2;
                const bodyWidth = width * 0.8;
                const bodyX = x + (width - bodyWidth) / 2;

                // Calculate pixels per price unit from chart dimensions
                // Chart height = height * 0.65, no margins
                const plotAreaHeight = height * 0.65;
                const priceRangeVal = priceDomain[1] - priceDomain[0];
                const pixelsPerPrice = plotAreaHeight / priceRangeVal;

                // Body position from Recharts
                const bodyTop = Math.min(y, y + (h || 0));
                const bodyBottom = Math.max(y, y + (h || 0));

                // Calculate wick positions using consistent scale
                const highY = bodyTop - (high - Math.max(open, close)) * pixelsPerPrice;
                const lowY = bodyBottom + (Math.min(open, close) - low) * pixelsPerPrice;

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

            {/* SMA 20 Line */}
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="sma20"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              connectNulls={true}
            />

            {/* SMA 50 Line */}
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="sma50"
              stroke="#a855f7"
              strokeWidth={1.5}
              dot={false}
              connectNulls={true}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Volume Chart - 30% */}
        <ResponsiveContainer width="100%" height={height * 0.35}>
          <ComposedChart data={chartData} margin={{ top: 0, right: 5, left: 5, bottom: 0 }} syncId={`index-${name}`}>
            <XAxis
              dataKey="dateLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, dy: -2 }}
              interval={Math.floor(chartData.length / 6)}
              height={16}
            />

            <YAxis
              domain={[0, volumeMax * 1.2]}
              className="text-muted-foreground"
              fontSize={8}
              width={40}
              tickFormatter={(v) => `${(v / 1e9).toFixed(0)}B`}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={() => null} />

            <Bar dataKey="volume" barSize={8} radius={[1, 1, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`vol-${index}`}
                  fill={entry.isUp ? "#22c55e" : "#ef4444"}
                  fillOpacity={0.6}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface IndicesOHLCVGridProps {
  indices: IndicesOHLCVHistory[];
}

export function IndicesOHLCVGrid({ indices }: IndicesOHLCVGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {indices.map((index) => (
        <IndexOHLCVChart
          key={index.code}
          name={index.name}
          data={index.data}
          height={220}
        />
      ))}
    </div>
  );
}
