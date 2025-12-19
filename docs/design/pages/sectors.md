# Sectors Page

> **Route**: `/sectors`
> **File**: `src/app/sectors/page.tsx`
> **Type**: Async Server Component with Client Content

## Overview

The L2 Sector Rotation analysis page. Displays sector rankings, momentum metrics, rotation bias, and animated historical visualization. Integrates with L2 report system.

---

## URL Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date` | string | Latest trading date | Analysis date (YYYY-MM-DD) |

**Example**: `/sectors?date=2025-12-18`

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ Header: "Sector Rotation" title + "View Report" button              │
├─────────────────────────────────────────────────────────────────────┤
│ Rotation Banner                                                     │
│ [OFFENSIVE/NEUTRAL/DEFENSIVE] [CYCLE_PHASE] + Leading/Lagging      │
├─────────────────────────────────────────────────────────────────────┤
│ Sector Rankings Table (Unified with MRS Chart)                      │
│ ┌────────────────────────────────────┬──────────────────────────────┤
│ │ # + Sparkline | ETF | Sector       │ Zone | Signal | MRS Bar      │
│ │ (rank history with dots)           │ (separator at 48.5%)          │
│ │                                    │ Green/Red bars + Orange dot   │
│ └────────────────────────────────────┴──────────────────────────────┤
├─────────────────────────────────────────────────────────────────────┤
│ Sector Rotation Map (Animated Scatter Plot)                         │
│ X: MRS_20 (momentum strength), Y: MRS_5 (short-term momentum)       │
│ [Play/Pause] [Restart] [Timeline]                                   │
│ - Quadrants: Weakening | Momentum | Toxic | Ignition                │
│ - Zone-colored dots with sector labels                              │
│ - Animated playback over 10-day history                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. RotationBanner
**File**: `src/components/sectors/rotation-banner.tsx`

Displays rotation bias and cycle phase with leading/lagging sectors.

| Prop | Type | Description |
|------|------|-------------|
| `rotationBias` | `RotationBias` | OFFENSIVE, NEUTRAL, or DEFENSIVE |
| `cyclePhase` | `CyclePhase` | EARLY/MID/LATE_EXPANSION, CONTRACTION, NEUTRAL |
| `sectors` | `SectorWithSignal[]` | All sector data for leading/lagging calculation |

### 2. SectorRankingsTable
**File**: `src/components/sectors/sector-rankings-table.tsx`

Unified table combining sector rankings with inline MRS visualization.

| Prop | Type | Description |
|------|------|-------------|
| `sectors` | `SectorWithSignal[]` | Current sector data |
| `currentDate` | `string` | Display date |
| `history` | `SectorRotationHistoryDay[]` | 10-day history for sparklines |

**Sub-components:**
- `RankSparkline`: SVG mini-chart showing 10-day rank history with trend coloring
- `InlineMRSBar`: SVG bar chart showing MRS_20 (bar) + MRS_5 (orange dot)

**Table Columns:**
| Column | Width | Content |
|--------|-------|---------|
| # + Sparkline | 15.5% | Rank number + history chart |
| ETF | 5% | ETF ticker (mono) |
| Sector | 20% | Sector name |
| Zone | 8% | Zone badge (C/D/E/A/B/F) |
| Signal | 17.5% | Signal badge with animation |
| MRS | 34% | Inline bar chart |

**Sparkline Tooltip:**
- Shows on left side
- Table-formatted with columns: Date | Rank | Zone | Signal
- Reversed date order (most recent first)
- Separator `|` between Zone and Signal

**MRS Bar Reference Lines:**
- `-4%`: Red dashed (weak threshold)
- `-2%`: Red dashed (normal lower)
- `+3%`: Green dashed (normal upper)
- `+4%`: Green dashed (strong threshold)

### 3. SectorRotationMap
**File**: `src/components/sectors/sector-rotation-map.tsx`

Animated scatter plot showing sector positions in MRS space.

| Prop | Type | Description |
|------|------|-------------|
| `sectors` | `SectorWithSignal[]` | Current sector positions |
| `history` | `SectorRotationHistoryDay[]` | History for animation |

**Playback Controls:**
- Play/Pause button
- Restart button
- Timeline with clickable segments
- Current date indicator

**Quadrants:**
| Quadrant | X (MRS_20) | Y (MRS_5) | Label |
|----------|------------|-----------|-------|
| Top-Left | < 0 | > 0 | Ignition |
| Top-Right | > 0 | > 0 | Momentum |
| Bottom-Left | < 0 | < 0 | Toxic |
| Bottom-Right | > 0 | < 0 | Weakening |

### 4. L2ReportSheet
**File**: `src/components/sectors/l2-report-sheet.tsx`

Slide-out panel showing L2 sector analysis report in markdown.

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Sheet open state |
| `onOpenChange` | `(open: boolean) => void` | State handler |
| `tradingDate` | `string` | Report date |

---

## Data Requirements

### Server-Side Queries

```typescript
// src/app/sectors/page.tsx
const data = getSectorRotationData(currentDate);
const history = getSectorRotationHistory(10, currentDate);
```

### Data Types

```typescript
interface SectorWithSignal {
  sector_name: string;
  etf_ticker: string;
  mrs_5: number;
  mrs_20: number;
  roc_3: number;
  close: number | null;
  zone: Zone;        // C | D | E | A | B | F
  signal: Signal;    // RECOVERY_STRONG | ... | WEAKENING
  modifier: number;
  rank: number;
}

interface SectorRotationData {
  sectors: SectorWithSignal[];
  rotationBias: RotationBias;    // OFFENSIVE | NEUTRAL | DEFENSIVE
  cyclePhase: CyclePhase;        // EARLY_EXPANSION | ... | NEUTRAL
  bullishCount: number;
  bearishCount: number;
  reportPath: string | null;
}

interface SectorRotationHistoryDay {
  date: string;
  sectors: SectorWithSignal[];
}
```

### Data Source

Primary table: `l2_sector_rankings` (pre-computed by backend)

| Column | Type | Description |
|--------|------|-------------|
| `date` | TEXT | Trading date |
| `sector_name` | TEXT | Full sector name |
| `etf_ticker` | TEXT | ETF symbol (XLK, XLF, etc.) |
| `mrs_5` | REAL | 5-day momentum score |
| `mrs_20` | REAL | 20-day momentum score |
| `roc_3` | REAL | 3-day rate of change |
| `close` | REAL | ETF close price |
| `zone` | TEXT | Zone classification |
| `signal` | TEXT | Trading signal |
| `modifier` | REAL | Signal modifier |
| `rank` | INTEGER | Sector rank (1-11) |

---

## Zone Classification

| Zone | Label | MRS_20 Range | Color |
|------|-------|--------------|-------|
| C | Toxic | ≤ -3.5% | Red |
| D | Ignition | -3.5% to -0.5% | Amber |
| E | Noise | -0.5% to 0.5% | Gray |
| A | Trend | 0.5% to 2.8% | Blue |
| B | Weakening | MRS_5 < 0 (fading) | Orange |
| F | Momentum | ≥ 2.8% | Green |

---

## Signal Classification

| Signal | Zone | Condition | Color | Animation |
|--------|------|-----------|-------|-----------|
| RECOVERY_STRONG | C | MRS_5 > 0 | Emerald | - |
| RECOVERY_EARLY | C | ROC_3 > 0 | Emerald | - |
| TOXIC | C | No recovery | Red | - |
| IGNITION | D | Default | Amber | - |
| AVOID | D | MRS_5 < -1% | Red | - |
| NEUTRAL | E | Default | Gray | - |
| TREND | A | Default | Blue | Pulse |
| MOMENTUM | F | Default | Green | Pulse |
| WEAKENING | B | Default | Orange | - |

---

## Rotation Bias Logic

```typescript
// Offensive ETFs: XLK, XLY, XLF, XLC, XLI
// Defensive ETFs: XLV, XLP, XLU, XLRE

OFFENSIVE: offensive_strength >= 2 AND defensive_strength <= -1
DEFENSIVE: defensive_strength >= 2 AND offensive_strength <= -1
NEUTRAL: otherwise
```

---

## Cycle Phase Logic

```typescript
const CYCLE_SECTORS = {
  early: ['XLF', 'XLY'],
  mid: ['XLK', 'XLI', 'XLC'],
  late: ['XLE', 'XLB'],
  defensive: ['XLU', 'XLP', 'XLV', 'XLRE'],
};

// Phase = whichever group has most bullish signals
// CONTRACTION if defensive leads
```

---

## Exports

**From `src/components/sectors/index.ts`:**
- `RotationBanner`
- `SectorRankingsTable`
- `SectorRotationMap`
- `L2ReportSheet`

---

## Implementation Notes

1. **Playback Control**: Only `SectorRotationMap` has playback controls; the rankings table shows current-day data with sparklines for history context.

2. **Unified Table**: Sector Rankings merges the old separate MRS Momentum chart into inline bar visualization, reducing visual complexity.

3. **Column Alignment**: Visual separator at 48.5% between Zone and Signal columns for balance.

4. **Tooltip UX**: Sparkline tooltip shows on left side with table-formatted historical data.

5. **No Dead Code**: `SignalSummaryCards` component was removed (unused).
