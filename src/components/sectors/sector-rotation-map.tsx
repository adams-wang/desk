"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SectorWithSignal, SectorRotationHistoryDay } from "@/lib/queries/sectors";

// Segmented Timeline Component
interface SegmentedTimelineProps {
  total: number;
  current: number;
  onChange: (index: number) => void;
}

function SegmentedTimeline({ total, current, onChange }: SegmentedTimelineProps) {
  return (
    <div className="flex items-center gap-1 w-[560px]">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`flex-1 h-1.5 rounded-full transition-all cursor-pointer hover:opacity-80 ${
            i === current
              ? "bg-blue-500"
              : i < current
              ? "bg-blue-500/50"
              : "bg-muted"
          }`}
          aria-label={`Go to frame ${i + 1}`}
        />
      ))}
    </div>
  );
}

interface SectorRotationMapProps {
  sectors: SectorWithSignal[];
  history?: SectorRotationHistoryDay[];
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
const CHART_HEIGHT = 375;
const PADDING = { top: 6, right: 24, bottom: 40, left: 44 };
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

export function SectorRotationMap({ sectors, history }: SectorRotationMapProps) {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(history ? history.length - 1 : 0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const PLAYBACK_INTERVAL = 1200; // ms per frame

  // Tooltip state
  const [hoveredSector, setHoveredSector] = useState<SectorWithSignal | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get current data based on playback state
  const hasHistory = history && history.length > 0;
  const currentData = hasHistory ? history[currentIndex] : null;
  const displaySectors = currentData?.sectors || sectors;
  const displayDate = currentData?.date || null;

  // Reset to latest when history changes
  useEffect(() => {
    if (history && history.length > 0) {
      setCurrentIndex(history.length - 1);
      setIsPlaying(false);
    }
  }, [history]);

  // Playback logic
  useEffect(() => {
    if (isPlaying && hasHistory) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= history.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, PLAYBACK_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, hasHistory, history?.length]);

  const handlePlayPause = useCallback(() => {
    if (!hasHistory) return;
    if (currentIndex >= history.length - 1) {
      // If at end, restart from beginning
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  }, [hasHistory, currentIndex, history?.length]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    if (hasHistory) {
      setCurrentIndex(history.length - 1);
    }
  }, [hasHistory, history?.length]);

  const handleSegmentClick = useCallback((index: number) => {
    setIsPlaying(false);
    setCurrentIndex(index);
  }, []);

  // Y-axis ticks
  const yTicks = [-3, -1, 0, 1, 3];

  return (
    <Card className="py-0 gap-0">
      <CardHeader className="pb-1 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm font-medium">Sector Rotation</CardTitle>
            {/* Playback Controls */}
            {hasHistory && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayPause}
                  className="p-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                  title="Reset to latest"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          {/* Date and Progress */}
          {hasHistory && (
            <div className="flex items-center gap-3">
              <SegmentedTimeline
                total={history.length}
                current={currentIndex}
                onChange={handleSegmentClick}
              />
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                {displayDate} ({currentIndex + 1}/{history.length})
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-2 pb-2">
        <div ref={containerRef} className="relative">
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
            {displaySectors.map((sector, index) => {
              const x = toSvgX(sector.mrs_20);
              const y = toSvgY(sector.mrs_5);
              const color = getSignalColor(sector.signal);
              const etf = sector.etf_ticker;
              // Pulse for strong bullish signals when not playing
              const shouldPulse = !isPlaying && ['TREND', 'MOMENTUM'].includes(sector.signal);

              // Use transform for smooth animation in playback mode
              const transformStyle = hasHistory
                ? {
                    transform: `translate(${x}px, ${y}px)`,
                    transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                  }
                : {
                    transform: `translate(${x}px, ${y}px)`,
                    animation: `fadeSlideIn 0.4s ease-out ${index * 0.05}s both`
                  };

              const isHovered = hoveredSector?.etf_ticker === etf;

              return (
                <g
                  key={etf}
                  className="cursor-pointer"
                  style={{
                    ...transformStyle,
                    transformOrigin: '0 0',
                  }}
                  onMouseEnter={() => {
                    setHoveredSector(sector);
                    setTooltipPos({ x, y });
                  }}
                  onMouseLeave={() => {
                    setHoveredSector(null);
                    setTooltipPos(null);
                  }}
                >
                  {/* Pulse ring for strong bullish signals */}
                  {shouldPulse && (
                    <circle
                      cx={0}
                      cy={0}
                      r={20}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.4}
                      style={{ animation: 'pulse 2s ease-in-out infinite' }}
                    />
                  )}
                  {/* Hover ring - always rendered, opacity changes */}
                  <circle
                    cx={0}
                    cy={0}
                    r={22}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    opacity={isHovered ? 0.5 : 0}
                    style={{ transition: 'opacity 0.15s ease' }}
                  />
                  {/* Outer ring for emphasis */}
                  <circle
                    cx={0}
                    cy={0}
                    r={18}
                    fill={color}
                    opacity={isHovered ? 0.2 : 0.1}
                  />
                  {/* Main dot */}
                  <circle
                    cx={0}
                    cy={0}
                    r={14}
                    fill={color}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                  {/* ETF label */}
                  <text
                    x={0}
                    y={1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-white font-semibold pointer-events-none"
                    style={{ fontSize: "9px" }}
                  >
                    {etf.replace("XL", "")}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Custom Tooltip */}
          {hoveredSector && tooltipPos && (() => {
            // Get T-1 and T-2 zones from history
            const t1Sector = hasHistory && currentIndex > 0
              ? history[currentIndex - 1]?.sectors.find(s => s.etf_ticker === hoveredSector.etf_ticker)
              : null;
            const t2Sector = hasHistory && currentIndex > 1
              ? history[currentIndex - 2]?.sectors.find(s => s.etf_ticker === hoveredSector.etf_ticker)
              : null;

            return (
              <div
                className="absolute z-50 pointer-events-none bg-popover/90 backdrop-blur-md border border-border rounded-lg p-2 shadow-lg text-xs"
                style={{
                  left: `${(tooltipPos.x / CHART_WIDTH) * 100}%`,
                  top: `${(tooltipPos.y / CHART_HEIGHT) * 100}%`,
                  transform: 'translate(-50%, calc(-100% - 20px))',
                }}
              >
                <div className="font-semibold mb-1.5">{hoveredSector.sector_name} ({hoveredSector.etf_ticker})</div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">20D Strength:</span>
                    <span className="font-mono">{hoveredSector.mrs_20 >= 0 ? "+" : ""}{hoveredSector.mrs_20.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">5D Strength:</span>
                    <span className="font-mono">{hoveredSector.mrs_5 >= 0 ? "+" : ""}{hoveredSector.mrs_5.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Zone:</span>
                    <span>{ZONE_NAMES[hoveredSector.zone] || hoveredSector.zone}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Signal:</span>
                    <span className="font-semibold" style={{ color: getSignalColor(hoveredSector.signal) }}>
                      {formatSignal(hoveredSector.signal)}
                      {SIGNAL_WIN_RATES[hoveredSector.signal] && (
                        <span className="font-normal text-muted-foreground ml-1">({SIGNAL_WIN_RATES[hoveredSector.signal]}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Modifier:</span>
                    <span className="font-mono">{hoveredSector.modifier.toFixed(2)}x</span>
                  </div>
                </div>
                {/* T-1 and T-2 Zone History */}
                {(t1Sector || t2Sector) && (
                  <div className="mt-1.5 pt-1.5 border-t border-border/50 flex flex-col gap-0.5">
                    {t1Sector && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">T-1:</span>
                        <span>{ZONE_NAMES[t1Sector.zone] || t1Sector.zone}</span>
                      </div>
                    )}
                    {t2Sector && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">T-2:</span>
                        <span>{ZONE_NAMES[t2Sector.zone] || t2Sector.zone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}
