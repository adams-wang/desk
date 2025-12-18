"use client";

import { cn } from "@/lib/utils";

interface BreadthBarProps {
  percentage: number;
  above: number;
  total: number;
}

function getBreadthColor(pct: number): string {
  if (pct < 30) return "bg-red-500";
  if (pct < 50) return "bg-amber-500";
  if (pct < 70) return "bg-blue-500";
  return "bg-emerald-500";
}

function getBreadthLabel(pct: number): string {
  if (pct < 30) return "Weak";
  if (pct < 50) return "Moderate";
  if (pct < 70) return "Healthy";
  return "Strong";
}

export function BreadthBar({ percentage, above, total }: BreadthBarProps) {
  const color = getBreadthColor(percentage);
  const label = getBreadthLabel(percentage);

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Market Breadth</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tabular-nums">
            {percentage.toFixed(1)}%
          </span>
          <span className={cn("text-sm font-medium", color.replace("bg-", "text-"))}>
            {label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all duration-500", color)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Detail text */}
      <div className="text-xs text-muted-foreground">
        {above.toLocaleString()} / {total.toLocaleString()} stocks above 50-day MA
      </div>
    </div>
  );
}
