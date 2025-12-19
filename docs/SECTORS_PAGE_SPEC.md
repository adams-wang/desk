# Sectors Page Design Specification

**Version:** 1.0
**Date:** 2025-12-18
**Status:** Draft - Pending Approval
**Reference:** L2 Sector Contract v6.1

---

## 1. Purpose

Surface L2 sector rotation intelligence in an actionable format. Transform raw MRS data into clear trading signals with position guidance.

**Core Question Answered:** "Which sectors should I overweight/underweight today?"

---

## 2. Information Architecture

### 2.1 Hierarchy (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SECTOR STRIP (inherited from Market - global context)       │
├─────────────────────────────────────────────────────────────────┤
│  2. ROTATION BANNER                                             │
│     - Rotation Bias: OFFENSIVE / NEUTRAL / DEFENSIVE            │
│     - Cycle Phase: EARLY_EXP / MID_EXP / LATE_EXP / CONTRACTION│
│     - View L2 Report button                                     │
├─────────────────────────────────────────────────────────────────┤
│  3. SIGNAL SUMMARY CARDS (3 columns)                            │
│     - Bullish Signals (count + sectors)                         │
│     - Bearish Signals (count + sectors)                         │
│     - Rotation Velocity (HIGH/MODERATE/LOW)                     │
├─────────────────────────────────────────────────────────────────┤
│  4. SECTOR RANKINGS TABLE                                       │
│     - Rank | Sector | ETF | Zone | Signal | Modifier | MRS_20   │
│     - Clickable rows → /stocks?sector={sector}                  │
├─────────────────────────────────────────────────────────────────┤
│  5. ZONE VISUALIZATION (Optional - Phase 2)                     │
│     - Visual field showing sectors positioned by MRS_20/MRS_5   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Progressive Disclosure

| Level | What User Sees | Detail |
|-------|---------------|--------|
| **L1 - Glance** | Rotation Banner | "OFFENSIVE bias, MID_EXPANSION" |
| **L2 - Scan** | Signal Cards | "3 bullish, 2 bearish signals" |
| **L3 - Analyze** | Rankings Table | Full sector breakdown with zones |
| **L4 - Deep Dive** | L2 Report Sheet | LLM narrative analysis |

---

## 3. Component Specifications

### 3.1 Rotation Banner

**Purpose:** Immediate market rotation context (mirrors RegimeBanner pattern)

```
┌──────────────────────────────────────────────────────────────────┐
│  ROTATION BIAS        │  CYCLE PHASE         │  View Report →   │
│  ─────────────────    │  ─────────────────   │                  │
│  OFFENSIVE            │  MID_EXPANSION       │                  │
│  Offensive sectors    │  Growth leadership   │                  │
│  leading              │  broadening          │                  │
└──────────────────────────────────────────────────────────────────┘
```

**Colors:**
| Rotation Bias | Background | Border |
|---------------|------------|--------|
| OFFENSIVE | `emerald-500/10` | `emerald-500/20` |
| NEUTRAL | `blue-500/10` | `blue-500/20` |
| DEFENSIVE | `amber-500/10` | `amber-500/20` |

**Cycle Phase Labels:**
| Phase | Display | Description |
|-------|---------|-------------|
| EARLY_EXPANSION | Early Expansion | Recovery beginning |
| MID_EXPANSION | Mid Expansion | Growth leadership broadening |
| LATE_EXPANSION | Late Expansion | Rotation to defensives starting |
| CONTRACTION | Contraction | Defensive leadership |

### 3.2 Signal Summary Cards

**Layout:** 3 equal columns

#### Card 1: Bullish Signals
```
┌─────────────────────┐
│  Bullish Signals    │  ← muted label
│  ────────────────   │
│  4                  │  ← large emerald number
│  IGNITION, TREND    │  ← signal types (emerald text, smaller)
│  XLK, XLY, XLF, XLI │  ← sector ETFs
└─────────────────────┘
```

**Bullish signals:** RECOVERY_STRONG, RECOVERY_EARLY, IGNITION, TREND, MOMENTUM

#### Card 2: Bearish Signals
```
┌─────────────────────┐
│  Bearish Signals    │
│  ────────────────   │
│  2                  │  ← large red number
│  TOXIC, AVOID       │  ← signal types
│  XLU, XLRE          │  ← sector ETFs
└─────────────────────┘
```

**Bearish signals:** TOXIC, AVOID, WEAKENING

#### Card 3: Rotation Velocity
```
┌─────────────────────┐
│  Rotation Velocity  │
│  ────────────────   │
│  HIGH               │  ← amber/blue/zinc based on level
│  3 crossovers       │  ← count of recent zone changes
│  in last 5 days     │
└─────────────────────┘
```

### 3.3 Sector Rankings Table

**Columns:**

| Column | Align | Width | Format | Notes |
|--------|-------|-------|--------|-------|
| Rank | Left | 48px | `#1` | Position by MRS_20 |
| Sector | Left | flex | Text | Full name |
| ETF | Left | 64px | `XLK` | Ticker, muted |
| Zone | Center | 80px | Badge | Color-coded |
| Signal | Left | 120px | Badge + text | Primary action |
| Modifier | Right | 64px | `1.2x` | Position sizing |
| MRS_20 | Right | 72px | `+2.45%` | tabular-nums |
| MRS_5 | Right | 72px | `-0.32%` | tabular-nums |

**Zone Badge Colors:**

| Zone | Label | Background | Text |
|------|-------|------------|------|
| C | Toxic | `red-500/20` | `red-500` |
| D | Ignition | `amber-500/20` | `amber-600` |
| E | Noise | `zinc-500/20` | `zinc-500` |
| A | Trend | `blue-500/20` | `blue-500` |
| F | Momentum | `emerald-500/20` | `emerald-600` |
| B | Weakening | `orange-500/20` | `orange-500` |

**Signal Badge Colors:**

| Signal | Background | Text | Icon |
|--------|------------|------|------|
| RECOVERY_STRONG | `emerald-500` | white | ⬆️ |
| RECOVERY_EARLY | `emerald-400` | white | ↗️ |
| IGNITION | `emerald-500` | white | 🔥 |
| TREND | `blue-500` | white | 📈 |
| MOMENTUM | `blue-600` | white | 🚀 |
| NEUTRAL | `zinc-400` | white | ➖ |
| WEAKENING | `orange-500` | white | ⚠️ |
| AVOID | `red-400` | white | 🚫 |
| TOXIC | `red-500` | white | ☠️ |

**Row Interaction:**
- Hover: `bg-muted/50`
- Click: Navigate to `/stocks?sector={sector_name}&date={date}`
- Cursor: `pointer`

### 3.4 L2 Report Sheet

**Trigger:** "View Report" button in Rotation Banner

**Width:** `61.8vw` (golden ratio, consistent with L1 report)

**Content:**
- L2 Sector Analysis markdown report
- EN/ZH toggle (if translations exist)
- Path: `/Volumes/Data/quant/data/contracts/{date}/L2_Sector_Rotation.md`

---

## 4. Data Requirements

### 4.1 Computed Fields (Client-Side)

Since `l2_sector_rankings` may not be populated daily, compute zones/signals from raw indicators:

```typescript
function classifyZone(mrs20: number): Zone {
  if (mrs20 <= -3.5) return 'C';  // Toxic
  if (mrs20 < -0.5) return 'D';   // Ignition
  if (mrs20 <= 0.5) return 'E';   // Noise
  if (mrs20 < 2.8) return 'A';    // Trend
  return 'F';                      // Momentum
}

function classifySignal(mrs20: number, mrs5: number, roc3: number): Signal {
  // Zone C (Toxic)
  if (mrs20 <= -3.5) {
    if (mrs5 > 0) return { signal: 'RECOVERY_STRONG', modifier: 1.5 };
    if (roc3 > 0) return { signal: 'RECOVERY_EARLY', modifier: 1.2 };
    return { signal: 'TOXIC', modifier: 0.25 };
  }

  // Zone D (Ignition)
  if (mrs20 < -0.5) {
    if (mrs5 > 0) return { signal: 'IGNITION', modifier: 1.2 };
    return { signal: 'AVOID', modifier: 0.5 };
  }

  // Zone E (Noise)
  if (mrs20 <= 0.5) return { signal: 'NEUTRAL', modifier: 1.0 };

  // Zone B (Weakening) - cuts across A and F
  if (mrs20 > 0 && mrs5 < 0) return { signal: 'WEAKENING', modifier: 0.75 };

  // Zone A (Trend)
  if (mrs20 < 2.8) return { signal: 'TREND', modifier: 1.2 };

  // Zone F (Momentum)
  return { signal: 'MOMENTUM', modifier: 1.2 };
}
```

### 4.2 Database Queries

**Primary:** `sector_etf_indicators` (has MRS_5, MRS_20, close)

**Missing:** ROC_3 - needs calculation:
```sql
-- ROC_3 = MRS_20[today] - MRS_20[3 days ago]
SELECT
  a.etf_ticker,
  a.mrs_20 - b.mrs_20 as roc_3
FROM sector_etf_indicators a
JOIN sector_etf_indicators b
  ON a.etf_ticker = b.etf_ticker
  AND b.date = (SELECT date FROM trading_days WHERE day_rank = 4)
WHERE a.date = (SELECT date FROM trading_days WHERE day_rank = 1)
```

### 4.3 Derived Aggregates

| Field | Calculation |
|-------|-------------|
| Rotation Bias | Count bullish vs bearish in offensive/defensive sectors |
| Cycle Phase | Pattern match sector leadership |
| Rotation Velocity | Count zone changes in last 5 days |

---

## 5. Responsive Behavior

### 5.1 Breakpoints

| Breakpoint | Layout Changes |
|------------|----------------|
| `< 768px` (mobile) | Cards stack vertically, table scrolls horizontally |
| `768px - 1024px` (tablet) | 2-column cards, full table |
| `> 1024px` (desktop) | 3-column cards, full table |

### 5.2 Table Mobile Adaptation

On mobile, hide lower-priority columns:
- **Always show:** Rank, Sector, Signal, Modifier
- **Hide on mobile:** ETF, Zone, MRS_20, MRS_5

---

## 6. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Color + text | All signals have text labels, not just colors |
| Keyboard nav | Table rows focusable, Enter to navigate |
| Screen reader | ARIA labels on badges: "XLK Technology, Ignition signal, 1.2x modifier" |
| Contrast | All badge colors meet 4.5:1 ratio |

---

## 7. Performance

| Metric | Target |
|--------|--------|
| Initial load | < 500ms (server-rendered) |
| Zone calculation | Client-side, < 50ms |
| Table render | Virtualize if > 20 rows (unlikely for 11 sectors) |

---

## 8. Implementation Checklist

### Data Layer
- [ ] Add `getSectorDataWithROC3()` query - fetch MRS_20, MRS_5, ROC_3 for all sectors
- [ ] Add `classifySignal()` utility - Zone + Signal + Modifier from raw data
- [ ] Add `deriveRotationBias()` utility - OFFENSIVE/NEUTRAL/DEFENSIVE
- [ ] Add `deriveCyclePhase()` utility - economic cycle position

### Components
- [ ] `RotationBanner` - bias + cycle phase + View Report button
- [ ] `SignalSummaryCards` - bullish/bearish/velocity counts
- [ ] `SectorRankingsTable` - enhanced with Zone, Signal, Modifier columns
- [ ] `L2ReportSheet` - same pattern as L1 (EN/ZH toggle, 61.8vw)

### Page Assembly
- [ ] Rotation Banner at top
- [ ] Signal Summary Cards (3 columns)
- [ ] Rankings Table (clickable rows → /stocks?sector=X)
- [ ] L2 Report Sheet integration

### Future (Not in scope)
- Visual zone field (scatter plot)
- Sector correlation matrix
- Historical signal performance tracking

---

## 9. Complete Algorithms

### 9.1 Zone Classification

```typescript
type Zone = 'C' | 'D' | 'E' | 'A' | 'F';

function classifyZone(mrs20: number): Zone {
  if (mrs20 <= -3.5) return 'C';  // Toxic
  if (mrs20 < -0.5) return 'D';   // Ignition
  if (mrs20 <= 0.5) return 'E';   // Noise
  if (mrs20 < 2.8) return 'A';    // Trend
  return 'F';                      // Momentum
}
```

### 9.2 Signal Classification

```typescript
type Signal =
  | 'RECOVERY_STRONG' | 'RECOVERY_EARLY' | 'TOXIC'      // Zone C
  | 'IGNITION' | 'AVOID'                                 // Zone D
  | 'NEUTRAL'                                            // Zone E
  | 'TREND' | 'MOMENTUM' | 'WEAKENING';                  // Zone A/F/B

interface SignalResult {
  signal: Signal;
  modifier: number;
}

function classifySignal(mrs20: number, mrs5: number, roc3: number): SignalResult {
  // Zone C (Toxic): S <= -3.5%
  if (mrs20 <= -3.5) {
    if (mrs5 > 0) return { signal: 'RECOVERY_STRONG', modifier: 1.5 };
    if (roc3 > 0) return { signal: 'RECOVERY_EARLY', modifier: 1.2 };
    return { signal: 'TOXIC', modifier: 0.25 };
  }

  // Zone D (Ignition): -3.5% < S < -0.5%
  if (mrs20 < -0.5) {
    if (mrs5 > 0) return { signal: 'IGNITION', modifier: 1.2 };
    return { signal: 'AVOID', modifier: 0.5 };
  }

  // Zone E (Noise): -0.5% <= S <= 0.5%
  if (mrs20 <= 0.5) return { signal: 'NEUTRAL', modifier: 1.0 };

  // Zone B (Weakening): S > 0% AND MRS_5 < 0 (cuts across A and F)
  if (mrs5 < 0) return { signal: 'WEAKENING', modifier: 0.75 };

  // Zone A (Trend): 0.5% < S < 2.8%
  if (mrs20 < 2.8) return { signal: 'TREND', modifier: 1.2 };

  // Zone F (Momentum): S >= 2.8%
  return { signal: 'MOMENTUM', modifier: 1.2 };
}
```

### 9.3 ROC_3 Calculation

```sql
-- Get MRS_20 values for ROC_3 calculation
WITH dates AS (
  SELECT date, ROW_NUMBER() OVER (ORDER BY date DESC) as rn
  FROM trading_days WHERE date <= :current_date
)
SELECT
  a.etf_ticker,
  a.mrs_20 - COALESCE(b.mrs_20, a.mrs_20) as roc_3
FROM sector_etf_indicators a
LEFT JOIN sector_etf_indicators b
  ON a.etf_ticker = b.etf_ticker
  AND b.date = (SELECT date FROM dates WHERE rn = 4)
WHERE a.date = :current_date
```

### 9.4 Rotation Bias

```typescript
type RotationBias = 'OFFENSIVE' | 'NEUTRAL' | 'DEFENSIVE';

const OFFENSIVE_ETFS = ['XLK', 'XLY', 'XLF', 'XLC', 'XLI'];
const DEFENSIVE_ETFS = ['XLV', 'XLP', 'XLU', 'XLRE'];
const BULLISH_SIGNALS = ['RECOVERY_STRONG', 'RECOVERY_EARLY', 'IGNITION', 'TREND', 'MOMENTUM'];
const BEARISH_SIGNALS = ['TOXIC', 'AVOID', 'WEAKENING'];

function deriveRotationBias(sectors: SectorWithSignal[]): RotationBias {
  const countNet = (etfs: string[]) => {
    const group = sectors.filter(s => etfs.includes(s.etf));
    const bullish = group.filter(s => BULLISH_SIGNALS.includes(s.signal)).length;
    const bearish = group.filter(s => BEARISH_SIGNALS.includes(s.signal)).length;
    return bullish - bearish;
  };

  const offensiveStrength = countNet(OFFENSIVE_ETFS);
  const defensiveStrength = countNet(DEFENSIVE_ETFS);

  if (offensiveStrength >= 2 && defensiveStrength <= -1) return 'OFFENSIVE';
  if (defensiveStrength >= 2 && offensiveStrength <= -1) return 'DEFENSIVE';
  return 'NEUTRAL';
}
```

### 9.5 Cycle Phase

Based on economic sector rotation theory:
- **Early Expansion**: Financials, Consumer Cyclical lead (credit, demand)
- **Mid Expansion**: Tech, Industrials, Communication lead (capex, innovation)
- **Late Expansion**: Energy, Materials lead (inflation, commodities)
- **Contraction**: Utilities, Staples, Healthcare lead (safety)

```typescript
type CyclePhase = 'EARLY_EXPANSION' | 'MID_EXPANSION' | 'LATE_EXPANSION' | 'CONTRACTION' | 'NEUTRAL';

const CYCLE_SECTORS = {
  early: ['XLF', 'XLY'],
  mid: ['XLK', 'XLI', 'XLC'],
  late: ['XLE', 'XLB'],
  defensive: ['XLU', 'XLP', 'XLV', 'XLRE']
};

function deriveCyclePhase(sectors: SectorWithSignal[]): CyclePhase {
  const countBullish = (etfs: string[]) =>
    sectors.filter(s => etfs.includes(s.etf) && BULLISH_SIGNALS.includes(s.signal)).length;

  const scores = {
    early: countBullish(CYCLE_SECTORS.early),
    mid: countBullish(CYCLE_SECTORS.mid),
    late: countBullish(CYCLE_SECTORS.late),
    defensive: countBullish(CYCLE_SECTORS.defensive)
  };

  const max = Math.max(...Object.values(scores));
  if (max === 0) return 'NEUTRAL';

  if (scores.defensive === max) return 'CONTRACTION';
  if (scores.early === max) return 'EARLY_EXPANSION';
  if (scores.mid === max) return 'MID_EXPANSION';
  if (scores.late === max) return 'LATE_EXPANSION';
  return 'NEUTRAL';
}
```

---

## 10. L2 Report Integration

**Report Path:** `./reports/{date}/L2_Sector_Rotation.md` and `L2_Sector_Rotation.zh.md`

**Sheet Implementation:** Same pattern as L1 report sheet:
- 61.8vw width (golden ratio)
- EN/ZH language toggle
- Markdown rendering

---

## 11. References

- L2 Sector Contract: `/Volumes/Data/quant/docs/intel/02_l2_sector.md`
- Design Principles: `.claude/context/design-principles.md`
- Market Page (reference): `src/app/market/`
