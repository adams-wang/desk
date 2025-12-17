# PriceVolumeChart Component

> **File**: `src/components/charts/price-volume-chart.tsx`
> **Lines**: ~1600
> **Type**: Client Component (`"use client"`)

## Overview

The primary chart component displaying OHLCV data with multiple analytical overlays. Supports two rendering modes (Line/Candlestick) and three time ranges (1M/2M/3M).

---

## Architecture

### Component Hierarchy

```
PriceVolumeChart
├── Mode Toggle (Insight/OHLCV buttons)
├── Range Toggle (1M/2M/3M buttons)
├── Stats Bar (Close, Vol, Ratio, RSI, MACD)
├── Legend (Volume percentile colors)
└── Chart Container
    ├── LineChart (default mode)
    │   ├── VIX Regime Row (top axis)
    │   ├── Verdict Badges Row (clickable)
    │   ├── Price Area
    │   │   ├── Volume Bars (background)
    │   │   ├── Price Line (blue)
    │   │   ├── Volume MA Line (orange dashed)
    │   │   ├── Gap Badges (P/A indicators)
    │   │   └── Pattern Annotations
    │   ├── OFD Codes Row (bottom axis)
    │   └── Date Labels Row
    └── CandlestickChart (OHLCV mode)
        ├── Candlestick Bodies
        ├── Wicks (high/low)
        ├── Volume Bars
        └── SMA Lines (20/50/200)
```

### Data Flow

```
Props (server-fetched)
    │
    ▼
useMemo: Transform to chart format
    │
    ▼
Recharts ComposedChart
    │
    ├── Custom tick renderers (VIX, Verdicts, OFD)
    ├── Custom shape renderers (Candlesticks, Volume bars)
    └── Custom tooltip
```

---

## Props Interface

```typescript
interface PriceVolumeChartProps {
  data: StockOHLCVExtended[];      // Required: OHLCV with indicators
  vixHistory?: VIXData[];          // VIX regime data for top row
  sectorRankHistory?: SectorRankData[];
  height?: number;                  // Default: 400
  defaultMode?: "line" | "candle"; // Default: "line"
  currentRange?: 20 | 40 | 60;     // Affects compact mode
  onVerdictClick?: (date: string, verdict10: string | null, verdict20: string | null) => void;
}
```

---

## Visual Layers

### 1. VIX Regime Indicators (Top Axis)

**Purpose**: Show market risk environment context.

| Symbol | Meaning | Color |
|--------|---------|-------|
| `↗` | VIX rising fast (>2 pts) | Contextual |
| `→` | VIX stable | Contextual |
| `↘` | VIX falling fast (<-2 pts) | Contextual |

**Implementation**: Custom XAxis tick renderer on `xAxisId="vix"`.

### 2. L3 Verdict Badges (Second Row)

**Purpose**: Show trading signal from L3 contracts.

| Code | Meaning | Color |
|------|---------|-------|
| `B\|B` | Buy both 10d & 20d | Green `#22c55e` |
| `B\|H` | Buy 10d, Hold 20d | Blue `#3b82f6` |
| `A\|A` | Avoid both | Red `#ef4444` |
| `H\|H` | Hold both | Gray `#9ca3af` |

**Responsive Sizing**:
| View | Font Size | Weight | Pipe Separator |
|------|-----------|--------|----------------|
| 1M (20 days) | 10pt | bold | Yes `A\|B` |
| 2M (40 days) | 10pt | bold | Yes `A\|B` |
| 3M (60 days) | 9pt | bold | No `AB` |

**Interaction**: Clickable when report available. Triggers `onVerdictClick` callback.

```typescript
// Verdict color logic
const getLetterColor = (letter: string) => {
  if (letter === "B") return "#22c55e"; // green
  if (letter === "A") return "#ef4444"; // red
  return "#9ca3af"; // gray for H
};
```

### 3. Volume Bars

**Purpose**: Show trading volume with percentile-based coloring.

**Color Scheme** (by 10-day percentile):
| Percentile | Up Day | Down Day |
|------------|--------|----------|
| ≥75% (High) | Green `#22c55e` | Red `#ef4444` |
| 25-75% (Normal) | Green 60% opacity | Red 60% opacity |
| <25% (Low) | Green 30% opacity | Red 30% opacity |

**Acceleration Labels**: Show `1.5x`, `1.6x` etc. when volume ratio exceeds threshold.

### 4. Price Line

**Purpose**: Show closing price trend.

**Style**:
- Color: `#3b82f6` (blue)
- Stroke width: 2px
- Signal date marker: Red dot

### 5. Gap Indicators

**Purpose**: Show significant price gaps with interpretation.

**Badge Types**:
| Symbol | Meaning |
|--------|---------|
| `↑` | Gap up |
| `↓` | Gap down |
| `P` | PREFER (bullish gap in context) |
| `A` | AVOID (bearish gap in context) |

**Position**: Above volume bars at gap location.

### 6. OFD Codes (Bottom Axis)

**Purpose**: Show One-Frame-Daily candle pattern codes.

**Format**: `+SLN`, `-DBH`, etc.
- `+/-`: Direction (bullish/bearish)
- First letter: Size (S=Small, M=Medium, D=Doji, L=Large)
- Second letter: Body position (U=Upper, M=Middle, L=Lower, B=Bottom)
- Third letter: Volume (N=Normal, H=High, L=Low)

**Visibility**: Hidden in compact view (2M/3M) to reduce clutter.

### 7. Pattern Annotations

**Purpose**: Show technical pattern conclusions.

**Types**:
- `Support` - Price at support level
- `Resistance` - Price at resistance level
- `S↑ Test` - Testing support from above
- `R↓ Test` - Testing resistance from below
- `Breakdown` - Breaking below support
- `Breakout` - Breaking above resistance

**Style**: Small labels positioned near relevant price action.

---

## Modes

### Line Mode (Default)

Optimized for **information density**:
- All indicator overlays visible
- Volume bars in background
- Multiple annotation layers

### Candlestick Mode

Optimized for **price action analysis**:
- Traditional OHLC candlesticks
- SMA 20/50/200 overlays
- Volume bars below
- Cleaner, less cluttered

---

## Responsive Behavior

### Compact View (currentRange > 20)

Applied for 2M (40 days) and 3M (60 days) views:

| Element | Normal (1M) | Compact (2M/3M) |
|---------|-------------|-----------------|
| Verdict badges | 10pt bold `A\|B` | 9pt bold `AB` (3M only removes pipe) |
| OFD codes | Visible | Hidden |
| Date labels | Horizontal | Rotated -90° |
| Volume labels | All shown | Reduced |

```typescript
const isCompactView = currentRange > 20;
```

---

## Key Design Decisions

### 1. Verdict Badge Sizing

**Problem**: 60 data points in 3M view causes badge overlap.

**Solution**: Reduce font size (10pt → 9pt) and remove pipe separator for 3M.

**Tradeoff**: Slightly less readable vs. no overlap. Pipe removal saves ~30% width.

### 2. Volume Percentile Colors

**Problem**: Need to distinguish high/normal/low volume at a glance.

**Solution**: Three-tier opacity system based on 10-day percentile.

**Tradeoff**: Requires precomputed percentiles in database. Worth it for instant visual scanning.

### 3. Custom XAxis Renderers

**Problem**: Recharts XAxis only supports simple text labels.

**Solution**: Custom tick renderers returning SVG `<g>` elements with styled `<text>` and `<tspan>`.

**Tradeoff**: More code, but enables colored letters, click handlers, conditional formatting.

### 4. Dual Chart Modes

**Problem**: Different users need different views (quant vs. trader).

**Solution**: Toggle between information-dense line chart and clean candlestick chart.

**Tradeoff**: Two rendering paths to maintain. Unified data transformation helps.

---

## Performance

### Optimizations

1. **useMemo for data transformation**: Recompute only when props change
2. **Stable callback references**: Prevent unnecessary re-renders
3. **SVG over Canvas**: Better for accessibility, acceptable performance for <100 points

### Metrics

| Operation | Time |
|-----------|------|
| Data transform (60 points) | ~2ms |
| Initial render | ~80ms |
| Mode toggle | ~50ms |

---

## Usage Example

```tsx
<ChartWithReport
  data={extendedOHLCV}
  vixHistory={vixData}
  ticker="NVDA"
  onRangeChange={setRange}
  currentRange={40}
  hasL3_10={!!l3Contracts.l3_10}
  hasL3_20={!!l3Contracts.l3_20}
  verdict10={l3Contracts.l3_10?.verdict}
  verdict20={l3Contracts.l3_20?.verdict}
/>
```

---

## Related Components

- **ChartWithReport**: Wrapper that adds ReportSheet for verdict details
- **ReportSheet**: Slide-out panel showing L3 contract thesis
- **SectorMRSChart**: Companion chart for sector comparison
- **MRSTrajectoryChart**: Companion chart for momentum trajectory
