"use client";

import { cn } from "@/lib/utils";

interface VixGaugeProps {
  value: number;
  bucket: string;
}

// VIX thresholds from L1 spec
const VIX_THRESHOLDS = {
  CALM: 15,
  NORMAL: 22,
  ELEVATED: 35,
  MAX: 50, // Visual max for gauge
};

const bucketConfig: Record<string, { color: string; label: string }> = {
  CALM: { color: "bg-emerald-500", label: "Calm" },
  NORMAL: { color: "bg-blue-500", label: "Normal" },
  ELEVATED: { color: "bg-amber-500", label: "Elevated" },
  CRISIS: { color: "bg-red-500", label: "Crisis" },
};

export function VixGauge({ value, bucket }: VixGaugeProps) {
  // Normalize bucket to uppercase
  const normalizedBucket = bucket.toUpperCase();
  const config = bucketConfig[normalizedBucket] || bucketConfig.NORMAL;

  // Calculate marker position (0-100%)
  const clampedValue = Math.min(Math.max(value, 0), VIX_THRESHOLDS.MAX);
  const markerPosition = (clampedValue / VIX_THRESHOLDS.MAX) * 100;

  // Calculate zone widths
  const calmWidth = (VIX_THRESHOLDS.CALM / VIX_THRESHOLDS.MAX) * 100;
  const normalWidth =
    ((VIX_THRESHOLDS.NORMAL - VIX_THRESHOLDS.CALM) / VIX_THRESHOLDS.MAX) * 100;
  const elevatedWidth =
    ((VIX_THRESHOLDS.ELEVATED - VIX_THRESHOLDS.NORMAL) / VIX_THRESHOLDS.MAX) * 100;
  const crisisWidth = 100 - calmWidth - normalWidth - elevatedWidth;

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">VIX</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tabular-nums">{value.toFixed(2)}</span>
          <span className={cn("text-sm font-medium", config.color.replace("bg-", "text-"))}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Gauge bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        {/* Zone segments */}
        <div className="absolute inset-0 flex">
          <div
            className="h-full bg-emerald-500/30"
            style={{ width: `${calmWidth}%` }}
          />
          <div
            className="h-full bg-blue-500/30"
            style={{ width: `${normalWidth}%` }}
          />
          <div
            className="h-full bg-amber-500/30"
            style={{ width: `${elevatedWidth}%` }}
          />
          <div
            className="h-full bg-red-500/30"
            style={{ width: `${crisisWidth}%` }}
          />
        </div>

        {/* Marker */}
        <div
          className="absolute top-0 h-full w-1 -translate-x-1/2 rounded-full bg-foreground shadow-sm"
          style={{ left: `${markerPosition}%` }}
        />
      </div>

      {/* Threshold labels */}
      <div className="relative flex text-[10px] text-muted-foreground">
        <span className="absolute left-0">0</span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${calmWidth}%` }}
        >
          15
        </span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${calmWidth + normalWidth}%` }}
        >
          22
        </span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${calmWidth + normalWidth + elevatedWidth}%` }}
        >
          35
        </span>
        <span className="absolute right-0">50</span>
      </div>
    </div>
  );
}
