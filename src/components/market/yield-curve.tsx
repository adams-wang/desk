"use client";

import { cn } from "@/lib/utils";

interface YieldCurveProps {
  treasury3m: number;
  treasury5y: number;
  treasury10y: number;
  spread3m10y: number;
}

export function YieldCurve({
  treasury3m,
  treasury5y,
  treasury10y,
  spread3m10y,
}: YieldCurveProps) {
  const yields = [
    { label: "3M", value: treasury3m, x: 10 },
    { label: "5Y", value: treasury5y, x: 50 },
    { label: "10Y", value: treasury10y, x: 90 },
  ];

  const minYield = Math.min(...yields.map((y) => y.value)) - 0.2;
  const maxYield = Math.max(...yields.map((y) => y.value)) + 0.2;
  const range = maxYield - minYield || 1;

  const height = 60;
  const width = 100;
  const padding = { top: 8, bottom: 20, left: 0, right: 0 };

  const getY = (value: number) =>
    padding.top + (1 - (value - minYield) / range) * (height - padding.top - padding.bottom);

  const points = yields
    .map((y) => `${y.x},${getY(y.value)}`)
    .join(" ");

  const isInverted = spread3m10y < 0;
  const curveColor = isInverted ? "#ef4444" : "#22c55e";

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <svg width={width} height={height} className="overflow-visible">
          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={getY(treasury3m)}
            x2={width - padding.right}
            y2={getY(treasury3m)}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeDasharray="2,2"
          />

          {/* Curve line */}
          <polyline
            points={points}
            fill="none"
            stroke={curveColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {yields.map((y) => (
            <g key={y.label}>
              <circle
                cx={y.x}
                cy={getY(y.value)}
                r="3"
                fill={curveColor}
              />
              <text
                x={y.x}
                y={height - 4}
                textAnchor="middle"
                className="text-[9px] fill-muted-foreground"
              >
                {y.label}
              </text>
              <text
                x={y.x}
                y={getY(y.value) - 6}
                textAnchor="middle"
                className="text-[9px] fill-foreground font-medium"
              >
                {y.value.toFixed(2)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Spread</span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              isInverted ? "text-red-500" : "text-emerald-500"
            )}
          >
            {spread3m10y > 0 ? "+" : ""}
            {spread3m10y.toFixed(0)} bps
          </span>
        </div>
        {isInverted && (
          <span className="text-xs text-red-500 font-medium">
            Inverted
          </span>
        )}
      </div>
    </div>
  );
}
