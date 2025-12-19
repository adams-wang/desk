"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SectorWithSignal } from "@/lib/queries/sectors";

interface SectorRotationMapProps {
  sectors: SectorWithSignal[];
}

// Zone boundaries (MRS_20 / S axis)
const ZONE_BOUNDS = {
  toxic: -3.5,
  ignition: -0.5,
  noise: 0.5,
  trend: 2.8,
  extension: 4.3,
};

// Chart dimensions
const CHART_WIDTH = 800;
const CHART_HEIGHT = 400;
const PADDING = { top: 30, right: 40, bottom: 50, left: 50 };
const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

// X-axis range (MRS_20)
const X_MIN = -5;
const X_MAX = 5;
const X_RANGE = X_MAX - X_MIN;

// Y-axis range (MRS_5)
const Y_MIN = -3;
const Y_MAX = 3;
const Y_RANGE = Y_MAX - Y_MIN;

// Convert data coordinates to SVG coordinates
function toSvgX(mrs20: number): number {
  const clampedX = Math.max(X_MIN, Math.min(X_MAX, mrs20));
  return PADDING.left + ((clampedX - X_MIN) / X_RANGE) * PLOT_WIDTH;
}

function toSvgY(mrs5: number): number {
  const clampedY = Math.max(Y_MIN, Math.min(Y_MAX, mrs5));
  return PADDING.top + ((Y_MAX - clampedY) / Y_RANGE) * PLOT_HEIGHT;
}

// Zone colors matching the physics map
const ZONE_COLORS = {
  // Top row (V > 0)
  toxic_up: "#ef4444",      // Red - AVOID
  ignition: "#fbbf24",      // Yellow - ACCUMULATE (sweet spot)
  buffer_up: "#86efac",     // Light green - MAINTAIN
  trend: "#22c55e",         // Green - BUY/ADD
  extension: "#fbbf24",     // Yellow - HOLD
  exhaustion_up: "#f97316", // Orange/Red - EXIT

  // Bottom row (V < 0)
  toxic_down: "#ef4444",    // Red - AVOID
  lagging: "#fbbf24",       // Yellow - AVOID
  buffer_down: "#86efac",   // Light green - MAINTAIN
  weakening: "#86efac",     // Light green - HOLD/TRIM
  weakening_high: "#f97316",// Orange - TRIM
  exhaustion_down: "#ef4444",// Red - EXIT
};

// Get signal color for sector dot
function getSignalColor(signal: string): string {
  switch (signal) {
    case "RECOVERY_STRONG":
    case "RECOVERY_EARLY":
    case "IGNITION":
    case "TREND":
    case "MOMENTUM":
      return "#22c55e"; // Green - bullish
    case "TOXIC":
    case "AVOID":
    case "WEAKENING":
      return "#ef4444"; // Red - bearish
    default:
      return "#a1a1aa"; // Gray - neutral
  }
}

export function SectorRotationMap({ sectors }: SectorRotationMapProps) {
  // Calculate zone rectangles
  const zones = useMemo(() => {
    const zoneX = (val: number) => toSvgX(Math.max(X_MIN, Math.min(X_MAX, val)));
    const midY = toSvgY(0);
    const topY = PADDING.top;
    const botY = PADDING.top + PLOT_HEIGHT;

    return [
      // Top row (MRS_5 > 0)
      { x: zoneX(X_MIN), y: topY, w: zoneX(ZONE_BOUNDS.toxic) - zoneX(X_MIN), h: midY - topY, color: ZONE_COLORS.toxic_up, label: "TOXIC", action: "AVOID", opacity: 0.6 },
      { x: zoneX(ZONE_BOUNDS.toxic), y: topY, w: zoneX(ZONE_BOUNDS.ignition) - zoneX(ZONE_BOUNDS.toxic), h: midY - topY, color: ZONE_COLORS.ignition, label: "IGNITION", action: "ACCUMULATE", opacity: 0.6 },
      { x: zoneX(ZONE_BOUNDS.ignition), y: topY, w: zoneX(ZONE_BOUNDS.noise) - zoneX(ZONE_BOUNDS.ignition), h: midY - topY, color: ZONE_COLORS.buffer_up, label: "BUFFER", action: "MAINTAIN", opacity: 0.4 },
      { x: zoneX(ZONE_BOUNDS.noise), y: topY, w: zoneX(ZONE_BOUNDS.trend) - zoneX(ZONE_BOUNDS.noise), h: midY - topY, color: ZONE_COLORS.trend, label: "TREND", action: "BUY / ADD", opacity: 0.6 },
      { x: zoneX(ZONE_BOUNDS.trend), y: topY, w: zoneX(ZONE_BOUNDS.extension) - zoneX(ZONE_BOUNDS.trend), h: midY - topY, color: ZONE_COLORS.extension, label: "EXTENSION", action: "HOLD", opacity: 0.5 },
      { x: zoneX(ZONE_BOUNDS.extension), y: topY, w: zoneX(X_MAX) - zoneX(ZONE_BOUNDS.extension), h: midY - topY, color: ZONE_COLORS.exhaustion_up, label: "EXHAUSTION", action: "EXIT", opacity: 0.6 },

      // Bottom row (MRS_5 < 0)
      { x: zoneX(X_MIN), y: midY, w: zoneX(ZONE_BOUNDS.toxic) - zoneX(X_MIN), h: botY - midY, color: ZONE_COLORS.toxic_down, label: "TOXIC", action: "AVOID", opacity: 0.6 },
      { x: zoneX(ZONE_BOUNDS.toxic), y: midY, w: zoneX(ZONE_BOUNDS.ignition) - zoneX(ZONE_BOUNDS.toxic), h: botY - midY, color: ZONE_COLORS.lagging, label: "LAGGING", action: "AVOID", opacity: 0.4 },
      { x: zoneX(ZONE_BOUNDS.ignition), y: midY, w: zoneX(ZONE_BOUNDS.noise) - zoneX(ZONE_BOUNDS.ignition), h: botY - midY, color: ZONE_COLORS.buffer_down, label: "BUFFER", action: "MAINTAIN", opacity: 0.4 },
      { x: zoneX(ZONE_BOUNDS.noise), y: midY, w: zoneX(ZONE_BOUNDS.trend) - zoneX(ZONE_BOUNDS.noise), h: botY - midY, color: ZONE_COLORS.weakening, label: "WEAKENING", action: "HOLD / TRIM", opacity: 0.4 },
      { x: zoneX(ZONE_BOUNDS.trend), y: midY, w: zoneX(ZONE_BOUNDS.extension) - zoneX(ZONE_BOUNDS.trend), h: botY - midY, color: ZONE_COLORS.weakening_high, label: "WEAK HIGH", action: "TRIM", opacity: 0.5 },
      { x: zoneX(ZONE_BOUNDS.extension), y: midY, w: zoneX(X_MAX) - zoneX(ZONE_BOUNDS.extension), h: botY - midY, color: ZONE_COLORS.exhaustion_down, label: "EXHAUSTION", action: "EXIT", opacity: 0.6 },
    ];
  }, []);

  // X-axis ticks
  const xTicks = [X_MIN, ZONE_BOUNDS.toxic, ZONE_BOUNDS.ignition, ZONE_BOUNDS.noise, ZONE_BOUNDS.trend, ZONE_BOUNDS.extension, X_MAX];

  // Y-axis ticks
  const yTicks = [-2, -1, 0, 1, 2];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Sector Rotation Map</CardTitle>
        <p className="text-xs text-muted-foreground">
          X: Inertia (MRS_20) | Y: Velocity (MRS_5) | Plot shows current sector positions
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider delayDuration={0}>
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="w-full h-auto"
            style={{ maxHeight: "400px" }}
          >
            {/* Zone backgrounds */}
            {zones.map((zone, i) => (
              <rect
                key={i}
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                fill={zone.color}
                opacity={zone.opacity}
              />
            ))}

            {/* Zone labels */}
            {zones.slice(0, 6).map((zone, i) => (
              <g key={`label-${i}`}>
                <text
                  x={zone.x + zone.w / 2}
                  y={zone.y + 18}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-semibold"
                  style={{ fontSize: "10px" }}
                >
                  {zone.label}
                </text>
                <text
                  x={zone.x + zone.w / 2}
                  y={zone.y + 30}
                  textAnchor="middle"
                  className="fill-foreground/70 text-[8px]"
                  style={{ fontSize: "8px" }}
                >
                  {zone.action}
                </text>
              </g>
            ))}

            {/* Grid lines at zone boundaries */}
            {[ZONE_BOUNDS.toxic, ZONE_BOUNDS.ignition, ZONE_BOUNDS.noise, ZONE_BOUNDS.trend, ZONE_BOUNDS.extension].map((val) => (
              <line
                key={`vline-${val}`}
                x1={toSvgX(val)}
                y1={PADDING.top}
                x2={toSvgX(val)}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            ))}

            {/* Zero line (horizontal) */}
            <line
              x1={PADDING.left}
              y1={toSvgY(0)}
              x2={PADDING.left + PLOT_WIDTH}
              y2={toSvgY(0)}
              stroke="hsl(var(--foreground))"
              strokeWidth={1.5}
              opacity={0.5}
            />

            {/* Y-axis labels */}
            <text
              x={PADDING.left - 8}
              y={PADDING.top + 12}
              textAnchor="end"
              className="fill-emerald-500 text-[9px] font-medium"
              style={{ fontSize: "9px" }}
            >
              V &gt; 0
            </text>
            <text
              x={PADDING.left - 8}
              y={PADDING.top + PLOT_HEIGHT - 4}
              textAnchor="end"
              className="fill-red-500 text-[9px] font-medium"
              style={{ fontSize: "9px" }}
            >
              V &lt; 0
            </text>

            {/* X-axis */}
            <line
              x1={PADDING.left}
              y1={PADDING.top + PLOT_HEIGHT}
              x2={PADDING.left + PLOT_WIDTH}
              y2={PADDING.top + PLOT_HEIGHT}
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />

            {/* X-axis ticks and labels */}
            {xTicks.map((val) => (
              <g key={`xtick-${val}`}>
                <line
                  x1={toSvgX(val)}
                  y1={PADDING.top + PLOT_HEIGHT}
                  x2={toSvgX(val)}
                  y2={PADDING.top + PLOT_HEIGHT + 5}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                />
                <text
                  x={toSvgX(val)}
                  y={PADDING.top + PLOT_HEIGHT + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                  style={{ fontSize: "10px" }}
                >
                  {val > 0 ? `+${val}%` : `${val}%`}
                </text>
              </g>
            ))}

            {/* X-axis label */}
            <text
              x={PADDING.left + PLOT_WIDTH / 2}
              y={CHART_HEIGHT - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px] font-medium"
              style={{ fontSize: "11px" }}
            >
              Inertia (S = MRS_20)
            </text>

            {/* Y-axis ticks */}
            {yTicks.map((val) => (
              <g key={`ytick-${val}`}>
                <text
                  x={PADDING.left - 8}
                  y={toSvgY(val) + 3}
                  textAnchor="end"
                  className="fill-muted-foreground text-[9px]"
                  style={{ fontSize: "9px" }}
                >
                  {val > 0 ? `+${val}` : val}
                </text>
              </g>
            ))}

            {/* Sector dots */}
            {sectors.map((sector) => {
              const x = toSvgX(sector.mrs_20);
              const y = toSvgY(sector.mrs_5);
              const color = getSignalColor(sector.signal);
              const etf = sector.etf_ticker;

              return (
                <Tooltip key={etf}>
                  <TooltipTrigger asChild>
                    <g className="cursor-pointer">
                      {/* Outer glow */}
                      <circle
                        cx={x}
                        cy={y}
                        r={16}
                        fill={color}
                        opacity={0.15}
                      />
                      {/* Main dot */}
                      <circle
                        cx={x}
                        cy={y}
                        r={10}
                        fill={color}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                        className="transition-all hover:r-12"
                      />
                      {/* ETF label */}
                      <text
                        x={x}
                        y={y + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-white text-[7px] font-bold pointer-events-none"
                        style={{ fontSize: "7px" }}
                      >
                        {etf.replace("XL", "")}
                      </text>
                    </g>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="font-semibold">{sector.sector_name} ({etf})</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-muted-foreground">MRS_20:</span>
                      <span className="font-mono">{sector.mrs_20 >= 0 ? "+" : ""}{sector.mrs_20.toFixed(2)}%</span>
                      <span className="text-muted-foreground">MRS_5:</span>
                      <span className="font-mono">{sector.mrs_5 >= 0 ? "+" : ""}{sector.mrs_5.toFixed(2)}%</span>
                      <span className="text-muted-foreground">Signal:</span>
                      <span className="font-semibold" style={{ color }}>{sector.signal}</span>
                      <span className="text-muted-foreground">Modifier:</span>
                      <span className="font-mono">{sector.modifier.toFixed(2)}x</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Legend */}
            <g transform={`translate(${PADDING.left + PLOT_WIDTH - 120}, ${PADDING.top + 5})`}>
              <rect x={0} y={0} width={115} height={50} fill="hsl(var(--background))" opacity={0.8} rx={4} />
              <circle cx={12} cy={14} r={5} fill="#22c55e" />
              <text x={22} y={17} className="fill-foreground text-[9px]" style={{ fontSize: "9px" }}>Bullish Signal</text>
              <circle cx={12} cy={30} r={5} fill="#ef4444" />
              <text x={22} y={33} className="fill-foreground text-[9px]" style={{ fontSize: "9px" }}>Bearish Signal</text>
              <circle cx={12} cy={46} r={5} fill="#a1a1aa" />
              <text x={22} y={49} className="fill-foreground text-[9px]" style={{ fontSize: "9px" }}>Neutral</text>
            </g>
          </svg>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
