# Market Page Design Specification

**Version:** 1.0
**Date:** 2025-12-18
**Status:** Draft
**Author:** Claude (AI Assistant)

---

## Executive Summary

The Market page displays L1 macro-level analysis, providing users with market context before making individual stock decisions. It answers the fundamental question: **"Is the market environment favorable for equity investment?"**

### Design Philosophy

> **Show the L1 interpretation, not just raw indices.**
> Users can get S&P 500 prices anywhere. Our value-add is the L1 contract's judgment on what those numbers mean for position sizing.

---

## 1. Information Architecture

### 1.1 Hierarchy of Information

```
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 1: Decision Point (glanceable)                                │
│  ─────────────────────────────────                                  │
│  • Regime (RISK_ON / NORMAL / RISK_OFF / CRISIS)                    │
│  • Position Cap (0-150%)                                            │
│  • Transition Direction (IMPROVING / STABLE / DETERIORATING)        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 2: Context (scannable)                                        │
│  ─────────────────────────────                                      │
│  • 4 Major Indices (price + daily change)                           │
│  • VIX (value + bucket)                                             │
│  • Breadth (% above 50MA)                                           │
│  • Active Blockers (if any)                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 3: Detail (on-demand)                                         │
│  ───────────────────────────                                        │
│  • S&P 500 historical chart (20-day)                                │
│  • Yield curve visualization                                        │
│  • Key themes from news                                             │
│  • L1 report (full markdown)                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Sources

| Element | Table/Source | Fields |
|---------|--------------|--------|
| Indices | `indices_ohlcv` | `index_code`, `close`, `date` |
| L1 Contract | `l1_contracts` | `regime`, `final_position_pct`, `regime_transition`, `confidence`, `vix_value`, `vix_bucket`, `breadth_pct`, `hard_blocks` |
| VIX Detail | `market_regime` | `vix_close`, `vix_open`, `vix_high`, `vix_low` |
| Sentiment | `market_sentiment` | `put_call_ratio`, `breadth_pct`, `nyse_ad_ratio` |
| Yields | `treasury_yields` | `treasury_3m_close`, `treasury_5y_close`, `treasury_10y_close` |

---

## 2. Page Layout

### 2.1 Desktop (1440px viewport)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HEADER: Market Overview                              Last updated: 14:32 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     REGIME BANNER (Full Width)                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │   RISK_OFF   │  │  Position    │  │  Direction   │  [View Report]│ │
│  │  │   ████████   │  │    90%       │  │ DETERIORATING│               │ │
│  │  │  HIGH conf.  │  │  (reduced)   │  │      ↘       │               │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐   │
│  │        INDICES GRID           │  │       MARKET HEALTH           │   │
│  │  ┌─────────┐  ┌─────────┐     │  │                               │   │
│  │  │ S&P 500 │  │ NASDAQ  │     │  │  VIX        17.62  NORMAL     │   │
│  │  │  6,721  │  │  22,693 │     │  │  ────────────●────────────    │   │
│  │  │ -1.16%  │  │ -1.81%  │     │  │  15      22      35           │   │
│  │  └─────────┘  └─────────┘     │  │                               │   │
│  │  ┌─────────┐  ┌─────────┐     │  │  Breadth    52.6%             │   │
│  │  │   DOW   │  │ NDX 100 │     │  │  ████████████░░░░░░░░         │   │
│  │  │  47,886 │  │  24,648 │     │  │  347 / 660 stocks > 50MA     │   │
│  │  │ -0.47%  │  │ -1.93%  │     │  │                               │   │
│  │  └─────────┘  └─────────┘     │  │  Put/Call   0.83  NEUTRAL     │   │
│  │                               │  │  NYSE A/D   1.11  NEUTRAL     │   │
│  └───────────────────────────────┘  └───────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    S&P 500 CHART (20-Day)                           │ │
│  │  [1W] [1M] [3M]                                          6,800 ──── │ │
│  │                                                                      │ │
│  │     ╭──╮                                                  6,700 ──── │ │
│  │    ╱    ╲    ╭──╮                                                    │ │
│  │   ╱      ╲  ╱    ╲                                        6,600 ──── │ │
│  │  ╱        ╲╱      ╲                                                  │ │
│  │ ╱                  ╲___                                   6,500 ──── │ │
│  │                                                                      │ │
│  │  Dec 1                     Dec 10                       Dec 17       │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  BLOCKERS & ALERTS                                                │   │
│  │  ┌────────────────────────────────────────────────────────────┐   │   │
│  │  │  ⚠ FOMC in 41 days (Jan 28-29) - No constraint             │   │   │
│  │  │  ✓ VIX below crisis threshold (35)                         │   │   │
│  │  │  ✓ Sahm Rule not triggered (0.00)                          │   │   │
│  │  └────────────────────────────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Mobile (375px viewport)

```
┌─────────────────────────────┐
│  Market Overview            │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │      RISK_OFF         │  │
│  │     Position: 90%     │  │
│  │    DETERIORATING ↘    │  │
│  └───────────────────────┘  │
│                             │
│  S&P 500    6,721  -1.16%   │
│  NASDAQ    22,693  -1.81%   │
│  DOW       47,886  -0.47%   │
│  NDX 100   24,648  -1.93%   │
│                             │
│  ┌───────────────────────┐  │
│  │  VIX     17.62 NORMAL │  │
│  │  Breadth  52.6%       │  │
│  └───────────────────────┘  │
│                             │
│  [View Full Report →]       │
│                             │
└─────────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 Regime Banner

**Purpose:** Instant L1 verdict at a glance

```tsx
interface RegimeBannerProps {
  regime: 'RISK_ON' | 'NORMAL' | 'RISK_OFF' | 'CRISIS';
  positionPct: number;        // 0-150
  transition: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  tradingDate: string;        // YYYY-MM-DD
}
```

**Visual Treatment:**

| Regime | Background | Icon | Position Label |
|--------|------------|------|----------------|
| RISK_ON | `emerald-500/10` | 🟢 | "Aggressive (120-150%)" |
| NORMAL | `blue-500/10` | 🔵 | "Full (100%)" |
| RISK_OFF | `amber-500/10` | 🟡 | "Reduced (70-90%)" |
| CRISIS | `red-500/10` | 🔴 | "Blocked (0%)" |

**Transition Indicators:**

| Direction | Icon | Color |
|-----------|------|-------|
| IMPROVING | ↗ | `emerald-500` |
| STABLE | → | `zinc-400` |
| DETERIORATING | ↘ | `red-500` |

### 3.2 Index Cards

**Purpose:** Show major market indices with daily performance

```tsx
interface IndexCardProps {
  code: string;           // ^GSPC, ^DJI, ^IXIC, ^NDX
  name: string;           // S&P 500, DOW, etc.
  price: number;          // 6721.43
  dailyChange: number;    // -78.83
  dailyChangePct: number; // -1.16
}
```

**Display Rules:**
- Price: 2 decimal places, no currency symbol (indices aren't prices)
- Change: Show both absolute and percentage
- Color: `emerald-500` if positive, `red-500` if negative
- Format negative as `(-1.16%)` with parentheses

**Index Display Names:**

| Code | Display Name | Shorthand |
|------|--------------|-----------|
| ^GSPC | S&P 500 | SPX |
| ^DJI | Dow Jones | DOW |
| ^IXIC | NASDAQ Composite | NASDAQ |
| ^NDX | NASDAQ 100 | NDX |

### 3.3 VIX Gauge

**Purpose:** Visual representation of volatility bucket

```tsx
interface VixGaugeProps {
  value: number;          // 17.62
  bucket: 'CALM' | 'NORMAL' | 'ELEVATED' | 'CRISIS';
}
```

**Thresholds (from L1 spec):**

| Bucket | VIX Range | Visual Zone |
|--------|-----------|-------------|
| CALM | < 15 | Green zone (left) |
| NORMAL | 15-22 | Blue zone (center-left) |
| ELEVATED | 22-35 | Amber zone (center-right) |
| CRISIS | > 35 | Red zone (right) |

**Implementation:** Horizontal bar with marker showing current VIX position

### 3.4 Breadth Bar

**Purpose:** Show market participation (stocks above 50MA)

```tsx
interface BreadthBarProps {
  percentage: number;     // 52.6
  above: number;          // 347
  total: number;          // 660
}
```

**Visual Rules:**
- Progress bar filled to `percentage`
- Color gradient:
  - < 30%: `red-500` (weak breadth)
  - 30-50%: `amber-500` (moderate)
  - 50-70%: `blue-500` (healthy)
  - > 70%: `emerald-500` (strong breadth)

### 3.5 Blockers Card

**Purpose:** Show active hard blocks and upcoming events

```tsx
interface BlockerItemProps {
  type: 'vix_crisis' | 'sahm_triggered' | 'fomc_proximity' | 'clear';
  status: 'active' | 'warning' | 'clear';
  label: string;
  detail?: string;
}
```

**Status Icons:**

| Status | Icon | Color |
|--------|------|-------|
| active | ⛔ | `red-500` |
| warning | ⚠️ | `amber-500` |
| clear | ✓ | `emerald-500` |

### 3.6 S&P 500 Chart

**Purpose:** Price action context for market trend

**Implementation:** TradingView Lightweight Charts (consistent with stock pages)

**Config:**
- Default timeframe: 20 trading days (1 month)
- Chart type: Area chart (simpler than candlestick for index)
- Height: 300px
- Show crosshair with price tooltip
- Timeframe selector: 1W, 1M, 3M

---

## 4. API Routes

### 4.1 GET `/api/market/overview`

Returns L1 contract data + indices for the Market page.

**Response:**
```typescript
interface MarketOverviewResponse {
  tradingDate: string;
  generatedAt: string;

  // L1 Contract
  regime: 'RISK_ON' | 'NORMAL' | 'RISK_OFF' | 'CRISIS';
  regimeTransition: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number;
  positionPct: number;
  positionBias: string;

  // VIX
  vix: {
    value: number;
    bucket: string;
  };

  // Breadth
  breadth: {
    pct: number;
    above: number;
    total: number;
  };

  // Blockers
  hardBlocks: string[];
  fomcDaysAway: number;
  sahmTriggered: boolean;

  // Indices
  indices: Array<{
    code: string;
    name: string;
    close: number;
    prevClose: number;
    change: number;
    changePct: number;
  }>;

  // Sentiment
  sentiment: {
    putCallRatio: number;
    nyseAdRatio: number;
  };

  // Yields (optional, for detail view)
  yields?: {
    treasury3m: number;
    treasury5y: number;
    treasury10y: number;
    spread5y10y: number;
  };

  // Report path for "View Report" button
  reportPath: string;
}
```

### 4.2 GET `/api/market/indices/history`

Returns historical index data for chart.

**Query params:**
- `index`: Index code (default: `^GSPC`)
- `days`: Number of trading days (default: 20)

**Response:**
```typescript
interface IndexHistoryResponse {
  index: string;
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}
```

---

## 5. Database Queries

### 5.1 Market Overview Query

```sql
-- Get latest L1 contract with indices
WITH latest_date AS (
  SELECT date FROM trading_days WHERE day_rank = 1
),
indices_today AS (
  SELECT
    index_code,
    index_name,
    close,
    LAG(close) OVER (PARTITION BY index_code ORDER BY date) as prev_close
  FROM indices_ohlcv
  WHERE date >= (SELECT date FROM latest_date) - 1
),
l1 AS (
  SELECT * FROM l1_contracts
  WHERE trading_date = (SELECT date FROM latest_date)
)
SELECT
  l1.*,
  ms.breadth_pct,
  ms.breadth_above_50ma,
  ms.breadth_total,
  ms.put_call_ratio,
  ms.nyse_ad_ratio
FROM l1
JOIN market_sentiment ms ON l1.trading_date = ms.date;
```

---

## 6. Navigation & Routing

### 6.1 URL Structure

| Route | Purpose |
|-------|---------|
| `/market` | Market overview (this page) |
| `/market/report` | Full L1 markdown report (sheet/modal) |

### 6.2 Sidebar Integration

Add "Market" as the first navigation item (before Stocks):

```tsx
const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Market', href: '/market', icon: TrendingUp },  // NEW
  { name: 'Stocks', href: '/stocks', icon: BarChart3 },
  { name: 'Sectors', href: '/sectors', icon: PieChart },
  // ...
];
```

### 6.3 Homepage Widget

Add condensed Market widget to homepage (replace current "Market Status" card):

```tsx
// Compact version for homepage
<MarketStatusWidget
  regime={data.regime}
  positionPct={data.positionPct}
  vixValue={data.vix.value}
  vixBucket={data.vix.bucket}
  onClick={() => router.push('/market')}
/>
```

---

## 7. Interaction Patterns

### 7.1 Report Sheet

**Trigger:** "View Report" button in Regime Banner

**Behavior:**
- Open sheet from right (reuse `ReportSheet` component)
- Load markdown from `reportPath`
- Support language toggle (en/zh/kr) if available

### 7.2 Index Click

**Behavior:**
- Click on index card → focus chart on that index
- Update chart to show selected index

### 7.3 Refresh

**Auto-refresh:** Every 60 seconds during market hours (9:30 AM - 4:00 PM ET)

**Manual refresh:**
- Pull-to-refresh on mobile
- Refresh button in header

---

## 8. Error States

### 8.1 No L1 Contract

```tsx
<EmptyState
  icon={AlertCircle}
  title="Market Analysis Unavailable"
  description="L1 contract not generated for today. Analysis runs before market open."
/>
```

### 8.2 Stale Data

If `generatedAt` is > 24 hours old:

```tsx
<Alert variant="warning">
  <AlertTriangle className="h-4 w-4" />
  <AlertDescription>
    Market data from {format(generatedAt, 'MMM d')}.
    Latest analysis may not be available.
  </AlertDescription>
</Alert>
```

---

## 9. Accessibility

- [ ] Regime banner announces regime + position on focus
- [ ] VIX gauge has aria-label with value and bucket
- [ ] Color indicators have text labels (not color-only)
- [ ] Chart has summary description for screen readers
- [ ] All interactive elements keyboard accessible

---

## 10. Performance

- [ ] Initial load: < 500ms (single API call)
- [ ] Chart lazy loads below fold
- [ ] Indices animate price changes with `tabular-nums`
- [ ] Skeleton loading for all cards

---

## 11. Implementation Checklist

### Phase 1: Core Page
- [ ] Create `/src/app/market/page.tsx`
- [ ] Create `GET /api/market/overview` route
- [ ] Implement `RegimeBanner` component
- [ ] Implement `IndexCard` component
- [ ] Add to sidebar navigation

### Phase 2: Health Indicators
- [ ] Implement `VixGauge` component
- [ ] Implement `BreadthBar` component
- [ ] Implement `BlockersCard` component
- [ ] Add market sentiment display

### Phase 3: Chart & Detail
- [ ] Implement S&P 500 area chart
- [ ] Create `GET /api/market/indices/history` route
- [ ] Add timeframe selector
- [ ] Integrate Report Sheet

### Phase 4: Homepage Integration
- [ ] Create `MarketStatusWidget` (compact version)
- [ ] Replace static "Market Status" card on homepage
- [ ] Link widget to `/market` page

### Phase 5: Polish
- [ ] Add loading skeletons
- [ ] Implement auto-refresh
- [ ] Add error states
- [ ] Accessibility audit
- [ ] Mobile responsive testing

---

## 12. Future Enhancements

1. **Yield Curve Visualization** - Show 3M/5Y/10Y spread graphically
2. **Historical Regime Timeline** - Show regime changes over time
3. **News Themes** - Display key themes from L1 contract
4. **Sector Heat Map** - Quick L2 overview on market page
5. **Position Sizing Calculator** - Interactive tool showing L1 × L2 impact

---

## Appendix: Sample Data

### A. L1 Contract Example (2025-12-17)

```json
{
  "trading_date": "2025-12-17",
  "regime": "RISK_OFF",
  "regime_transition": "DETERIORATING",
  "confidence": "HIGH",
  "confidence_score": 0.8,
  "vix_bucket": "NORMAL",
  "vix_value": 17.62,
  "final_position_pct": 90,
  "position_bias": "NORMAL",
  "hard_blocks": [],
  "breadth_pct": 52.6,
  "fomc_days_away": 41,
  "sahm_triggered": 0
}
```

### B. Indices Example (2025-12-17)

| Index | Close | Prev Close | Change |
|-------|-------|------------|--------|
| ^GSPC | 6,721.43 | 6,800.26 | -1.16% |
| ^IXIC | 22,693.32 | 23,111.46 | -1.81% |
| ^DJI | 47,885.97 | 48,114.26 | -0.47% |
| ^NDX | 24,647.61 | 25,132.94 | -1.93% |

---

*End of Specification*
