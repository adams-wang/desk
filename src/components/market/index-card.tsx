"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

// Mini sparkline component
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const height = 24;
  const width = 48;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  const strokeColor = positive ? "#22c55e" : "#ef4444";

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={width - padding}
          cy={height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2)}
          r="2"
          fill={strokeColor}
        />
      )}
    </svg>
  );
}

interface IndexCardProps {
  code: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  sparkline?: number[];
  weekChange?: number;
  onClick?: () => void;
}

export function IndexCard({
  name,
  price,
  change,
  changePct,
  sparkline,
  weekChange,
  onClick,
}: IndexCardProps) {
  const isPositive = change >= 0;
  const isWeekPositive = (weekChange ?? 0) >= 0;
  const changeColor = isPositive ? "text-emerald-500" : "text-red-500";

  // Format price - no decimals for large indices
  const formattedPrice = price.toLocaleString("en-US", {
    minimumFractionDigits: price < 1000 ? 2 : 0,
    maximumFractionDigits: price < 1000 ? 2 : 0,
  });

  // Format change
  const formattedChange = isPositive
    ? `+${change.toFixed(2)}`
    : change.toFixed(2);

  // Format percentage
  const formattedPct = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;

  // Format week change
  const formattedWeek = weekChange !== undefined
    ? `${weekChange >= 0 ? "+" : ""}${weekChange.toFixed(2)}%`
    : null;

  return (
    <Card
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">
              {name}
            </span>
            <span className="text-2xl font-bold tabular-nums">{formattedPrice}</span>
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("tabular-nums", changeColor)}>
                {formattedChange} ({formattedPct})
              </span>
            </div>
            {formattedWeek && (
              <span className={cn(
                "text-xs tabular-nums",
                isWeekPositive ? "text-emerald-500/70" : "text-red-500/70"
              )}>
                7d: {formattedWeek}
              </span>
            )}
          </div>
          {sparkline && sparkline.length > 1 && (
            <div className="mt-1">
              <Sparkline data={sparkline} positive={isWeekPositive} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface IndicesGridProps {
  indices: Array<{
    code: string;
    name: string;
    close: number;
    change: number;
    changePct: number;
    sparkline?: number[];
    weekChange?: number;
  }>;
  onIndexClick?: (code: string) => void;
}

export function IndicesGrid({ indices, onIndexClick }: IndicesGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {indices.map((index) => (
        <IndexCard
          key={index.code}
          code={index.code}
          name={index.name}
          price={index.close}
          change={index.change}
          changePct={index.changePct}
          sparkline={index.sparkline}
          weekChange={index.weekChange}
          onClick={onIndexClick ? () => onIndexClick(index.code) : undefined}
        />
      ))}
    </div>
  );
}
