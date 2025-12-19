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

// Chart dimensions - wider aspect ratio
const CHART_WIDTH = 1000;
const CHART_HEIGHT = 320;
const PADDING = { top: 24, right: 24, bottom: 40, left: 44 };
const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

// X-axis range (MRS_20)
const X_MIN = -5;
const X_MAX = 5.5;
const X_RANGE = X_MAX - X_MIN;

// Y-axis range (MRS_5)
const Y_MIN = -4;
const Y_MAX = 4;
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

// Get signal color for sector dot
function getSignalColor(signal: string): string {
  switch (signal) {
    case "MOMENTUM":
    case "TREND":
      return "#22c55e"; // Green - strong bullish
    case "IGNITION":
      return "#f59e0b"; // Amber - opportunity with caution
    case "WEAKENING":
      return "#86efac"; // Light green - fading momentum
    case "RECOVERY_STRONG":
      return "#d97706"; // Dark amber - strong recovery
    case "RECOVERY_EARLY":
      return "#eab308"; // Yellow - early recovery
    case "TOXIC":
    case "AVOID":
      return "#ef4444"; // Red - bearish
    default:
      return "#71717a"; // Zinc-500 - neutral
  }
}

// Zone letter to full name mapping
const ZONE_NAMES: Record<string, string> = {
  C: "Toxic",
  D: "Ignition",
  E: "Noise",
  A: "Trend",
  B: "Weakening",
  F: "Momentum",
};

// Signal win rates from L2 spec
const SIGNAL_WIN_RATES: Record<string, number> = {
  RECOVERY_STRONG: 89.5,
  RECOVERY_EARLY: 61.8,
  IGNITION: 61.5,
  WEAKENING: 67.3,
};

// Format signal name (replace underscores with spaces)
function formatSignal(signal: string): string {
  return signal.replace(/_/g, " ");
}

// Zone labels for bottom annotation (matching L2 spec v6.1)
const ZONE_LABELS = [
  { min: X_MIN, max: ZONE_BOUNDS.toxic, label: "TOXIC / AVOID", color: "#ef4444" },
  { min: ZONE_BOUNDS.ignition, max: ZONE_BOUNDS.noise, label: "NOISE / HOLD", color: "#71717a" },
];

export function SectorRotationMap({ sectors }: SectorRotationMapProps) {
  // Y-axis ticks
  const yTicks = [-3, -1, 0, 1, 3];

  // Calculate dynamic X range based on actual data
  const dataExtent = useMemo(() => {
    const mrs20Values = sectors.map(s => s.mrs_20);
    return {
      min: Math.min(...mrs20Values),
      max: Math.max(...mrs20Values),
    };
  }, [sectors]);

  return (
    <Card>
      <CardHeader className="pb-1 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Sector Rotation Map</CardTitle>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Bullish
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Bearish
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              Neutral
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-2 pb-2">
        <TooltipProvider delayDuration={0}>
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="w-full h-auto"
          >
            {/* Animation keyframes */}
            <defs>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 0.4; r: 20; }
                  50% { opacity: 0.15; r: 26; }
                }
                @keyframes fadeSlideIn {
                  0% { opacity: 0; transform: translateY(10px) scale(0.8); }
                  100% { opacity: 1; transform: translateY(0) scale(1); }
                }
              `}</style>
            </defs>
            {/* Zone backgrounds - muted but distinguishable */}
            {/* TOXIC zone - muted red */}
            <rect
              x={toSvgX(X_MIN)}
              y={PADDING.top}
              width={toSvgX(ZONE_BOUNDS.toxic) - toSvgX(X_MIN)}
              height={PLOT_HEIGHT}
              fill="#ef4444"
              opacity={0.12}
            />

            {/* IGNITION zone - top half amber (opportunity), bottom half muted */}
            <rect
              x={toSvgX(ZONE_BOUNDS.toxic)}
              y={PADDING.top}
              width={toSvgX(ZONE_BOUNDS.ignition) - toSvgX(ZONE_BOUNDS.toxic)}
              height={toSvgY(0) - PADDING.top}
              fill="#f59e0b"
              opacity={0.15}
            />
            <rect
              x={toSvgX(ZONE_BOUNDS.toxic)}
              y={toSvgY(0)}
              width={toSvgX(ZONE_BOUNDS.ignition) - toSvgX(ZONE_BOUNDS.toxic)}
              height={PADDING.top + PLOT_HEIGHT - toSvgY(0)}
              fill="#f59e0b"
              opacity={0.08}
            />

            {/* BUFFER zone - neutral */}
            <rect
              x={toSvgX(ZONE_BOUNDS.ignition)}
              y={PADDING.top}
              width={toSvgX(ZONE_BOUNDS.noise) - toSvgX(ZONE_BOUNDS.ignition)}
              height={PLOT_HEIGHT}
              fill="hsl(var(--muted-foreground))"
              opacity={0.08}
            />

            {/* TREND zone - top half only (bottom is covered by WEAKENING) */}
            <rect
              x={toSvgX(ZONE_BOUNDS.noise)}
              y={PADDING.top}
              width={toSvgX(ZONE_BOUNDS.trend) - toSvgX(ZONE_BOUNDS.noise)}
              height={toSvgY(0) - PADDING.top}
              fill="#22c55e"
              opacity={0.18}
            />

            {/* Zone F (MOMENTUM) - top half green (strong) */}
            <rect
              x={toSvgX(ZONE_BOUNDS.trend)}
              y={PADDING.top}
              width={toSvgX(X_MAX) - toSvgX(ZONE_BOUNDS.trend)}
              height={toSvgY(0) - PADDING.top}
              fill="#22c55e"
              opacity={0.15}
            />

            {/* Zone B (WEAKENING) - bottom half of S > 0 area (warning) */}
            {/* This cuts across zones A and F when MRS_5 < 0 */}
            <rect
              x={toSvgX(ZONE_BOUNDS.noise)}
              y={toSvgY(0)}
              width={toSvgX(X_MAX) - toSvgX(ZONE_BOUNDS.noise)}
              height={PADDING.top + PLOT_HEIGHT - toSvgY(0)}
              fill="#f59e0b"
              opacity={0.12}
            />

            {/* Vertical zone boundary lines */}
            {[ZONE_BOUNDS.toxic, ZONE_BOUNDS.ignition, ZONE_BOUNDS.noise, ZONE_BOUNDS.trend].map((val) => (
              <line
                key={`vline-${val}`}
                x1={toSvgX(val)}
                y1={PADDING.top}
                x2={toSvgX(val)}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                strokeDasharray="3,3"
                opacity={0.5}
              />
            ))}

            {/* Horizontal zero line (V = 0) */}
            <line
              x1={PADDING.left}
              y1={toSvgY(0)}
              x2={PADDING.left + PLOT_WIDTH}
              y2={toSvgY(0)}
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />

            {/* Horizontal grid lines */}
            {yTicks.filter(v => v !== 0).map((val) => (
              <line
                key={`hline-${val}`}
                x1={PADDING.left}
                y1={toSvgY(val)}
                x2={PADDING.left + PLOT_WIDTH}
                y2={toSvgY(val)}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                strokeDasharray="2,4"
                opacity={0.3}
              />
            ))}

            {/* Y-axis label: V > 0 */}
            <text
              x={PADDING.left - 6}
              y={PADDING.top + (toSvgY(0) - PADDING.top) / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              style={{ fontSize: "9px" }}
            >
              V&gt;0
            </text>

            {/* Y-axis label: V < 0 */}
            <text
              x={PADDING.left - 6}
              y={toSvgY(0) + (PADDING.top + PLOT_HEIGHT - toSvgY(0)) / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              style={{ fontSize: "9px" }}
            >
              V&lt;0
            </text>

            {/* Y-axis ticks */}
            {yTicks.map((val) => (
              <text
                key={`ytick-${val}`}
                x={PADDING.left - 6}
                y={toSvgY(val)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground"
                style={{ fontSize: "9px" }}
              >
                {val === 0 ? "0" : val > 0 ? `+${val}` : val}
              </text>
            ))}

            {/* Zone labels at bottom */}
            {ZONE_LABELS.map((zone) => {
              const centerX = (toSvgX(zone.min) + toSvgX(zone.max)) / 2;
              return (
                <text
                  key={zone.label}
                  x={centerX}
                  y={PADDING.top + PLOT_HEIGHT + 14}
                  textAnchor="middle"
                  style={{ fontSize: "9px", fill: zone.color, fontWeight: 500 }}
                >
                  {zone.label}
                </text>
              );
            })}

            {/* Zone signal labels inside chart */}
            {/* IGNITION zone top (V>0) */}
            <text
              x={(toSvgX(ZONE_BOUNDS.toxic) + toSvgX(ZONE_BOUNDS.ignition)) / 2}
              y={toSvgY(1.5)}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: "8px", fill: "#f59e0b", fontWeight: 500, opacity: 0.8 }}
            >
              IGNITION / BUY
            </text>

            {/* IGNITION zone bottom (V<0) */}
            <text
              x={(toSvgX(ZONE_BOUNDS.toxic) + toSvgX(ZONE_BOUNDS.ignition)) / 2}
              y={toSvgY(-1.5)}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: "8px", fill: "#ef4444", fontWeight: 500, opacity: 0.8 }}
            >
              AVOID / REDUCE
            </text>

            {/* TREND zone top (V>0) */}
            <text
              x={(toSvgX(ZONE_BOUNDS.noise) + toSvgX(ZONE_BOUNDS.trend)) / 2}
              y={toSvgY(1.5)}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: "8px", fill: "#22c55e", fontWeight: 500, opacity: 0.8 }}
            >
              TREND / ADD
            </text>

            {/* MOMENTUM zone top (V>0) */}
            <text
              x={(toSvgX(ZONE_BOUNDS.trend) + toSvgX(X_MAX)) / 2}
              y={toSvgY(1.5)}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: "8px", fill: "#22c55e", fontWeight: 500, opacity: 0.8 }}
            >
              MOMENTUM / HOLD STRONG
            </text>

            {/* WEAKENING - right zones bottom (V<0) */}
            <text
              x={(toSvgX(ZONE_BOUNDS.noise) + toSvgX(X_MAX)) / 2}
              y={toSvgY(-1.5)}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: "8px", fill: "#f59e0b", fontWeight: 500, opacity: 0.8 }}
            >
              WEAKENING / TRIM
            </text>

            {/* X-axis threshold values */}
            {[ZONE_BOUNDS.toxic, ZONE_BOUNDS.ignition, ZONE_BOUNDS.noise, ZONE_BOUNDS.trend].map((val) => (
              <text
                key={`xlabel-${val}`}
                x={toSvgX(val)}
                y={PADDING.top + PLOT_HEIGHT + 28}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: "8px" }}
              >
                {val > 0 ? `+${val}%` : `${val}%`}
              </text>
            ))}

            {/* Sector dots */}
            {sectors.map((sector, index) => {
              const x = toSvgX(sector.mrs_20);
              const y = toSvgY(sector.mrs_5);
              const color = getSignalColor(sector.signal);
              const etf = sector.etf_ticker;
              // Only pulse for strong bullish signals (not WEAKENING or recovery)
              const shouldPulse = ['TREND', 'MOMENTUM'].includes(sector.signal);

              return (
                <Tooltip key={etf}>
                  <TooltipTrigger asChild>
                    <g
                      className="cursor-pointer transition-all duration-500 ease-out hover:scale-110"
                      style={{
                        transformOrigin: `${x}px ${y}px`,
                        animation: `fadeSlideIn 0.4s ease-out ${index * 0.05}s both`
                      }}
                    >
                      {/* Pulse ring for strong bullish signals */}
                      {shouldPulse && (
                        <circle
                          cx={x}
                          cy={y}
                          r={20}
                          fill="none"
                          stroke={color}
                          strokeWidth={2}
                          opacity={0.4}
                          style={{ animation: 'pulse 2s ease-in-out infinite' }}
                        />
                      )}
                      {/* Outer ring for emphasis */}
                      <circle
                        cx={x}
                        cy={y}
                        r={18}
                        fill={color}
                        opacity={0.1}
                        className="transition-all duration-500"
                      />
                      {/* Main dot */}
                      <circle
                        cx={x}
                        cy={y}
                        r={14}
                        fill={color}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                        className="transition-all duration-500"
                      />
                      {/* ETF label */}
                      <text
                        x={x}
                        y={y + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-white font-semibold pointer-events-none"
                        style={{ fontSize: "9px" }}
                      >
                        {etf.replace("XL", "")}
                      </text>
                    </g>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs p-2">
                    <div className="font-semibold mb-1.5">{sector.sector_name} ({etf})</div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">MRS 20:</span>
                        <span className="font-mono">{sector.mrs_20 >= 0 ? "+" : ""}{sector.mrs_20.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">MRS 5:</span>
                        <span className="font-mono">{sector.mrs_5 >= 0 ? "+" : ""}{sector.mrs_5.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Zone:</span>
                        <span>{ZONE_NAMES[sector.zone] || sector.zone}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Signal:</span>
                        <span className="font-semibold" style={{ color }}>
                          {formatSignal(sector.signal)}
                          {SIGNAL_WIN_RATES[sector.signal] && (
                            <span className="font-normal text-muted-foreground ml-1">({SIGNAL_WIN_RATES[sector.signal]}%)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Modifier:</span>
                        <span className="font-mono">{sector.modifier.toFixed(2)}x</span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </svg>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
