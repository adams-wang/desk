# Stock Detail Page

> **Route**: `/stocks/[ticker]`
> **File**: `src/app/stocks/[ticker]/page.tsx`
> **Type**: Async Server Component

## Overview

The primary page for analyzing individual stocks. Displays comprehensive technical analysis, L3 trading signals, sector context, and analyst sentiment.

---

## URL Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ticker` | string | (required) | Stock symbol (e.g., NVDA, AAPL) |
| `date` | string | Latest trading date | Analysis date (YYYY-MM-DD) |
| `range` | number | 20 | Chart range: 20 (1M), 40 (2M), 60 (3M) |

**Example**: `/stocks/NVDA?date=2025-12-15&range=40`

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ Header: Ticker, Company Name, Sector, Price, Change                 │
├───────────────────────────────────┬─────────────────────────────────┤
│                                   │                                 │
│  P1: Price/Volume Chart           │  P2: Sector Rotation Chart      │
│  (ChartWithReport)                │  (SectorMRSChart)               │
│  - Line/Candle toggle             │  - Sector rankings over time    │
│  - 1M/2M/3M range                 │  - Current stock highlighted    │
│  - VIX regime indicators          │                                 │
│  - L3 verdict badges (clickable)  ├─────────────────────────────────┤
│  - Volume with percentiles        │                                 │
│  - Gap/pattern annotations        │  P3: MRS Trajectory Chart       │
│                                   │  (MRSTrajectoryChart)           │
│                                   │  - MRS 5/10/20 lines            │
│                                   │  - NASDAQ overlay               │
│                                   │  - Entry/confirm/exhaustion     │
├───────────────────────────────────┴─────────────────────────────────┤
│  Analyst Actions          │  Price Targets                          │
│  - Upgrades/Downgrades    │  - Target changes                       │
│  - Trend classification   │  - Bullish/Bearish signal               │
├───────────────────────────┴─────────────────────────────────────────┤
│  Trade Setup (L3)         │  Risk Metrics                           │
│  - Entry/Target/Stop      │  - Sharpe ratio                         │
│  - R/R ratio              │  - Volatility                           │
│  - Conviction score       │  - Beta                                 │
│  - Position sizing        │  - Alpha                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Requirements

### Server-Side Queries (Parallel)

```typescript
const [
  stock,                    // getStockDetail()
  extendedOHLCV,           // getStockOHLCVExtended()
  mrsHistory,              // getMRSHistory()
  sectorMRSHistory,        // getSectorMRSHistory()
  vixHistory,              // getVIXHistory()
  nasdaqHistory,           // getNASDAQHistory()
  sectorRankHistory,       // getSectorRankHistory()
  analystActions,          // getAnalystActions()
  analystTargets,          // getAnalystTargets()
  l3Contracts,             // getL3Contracts()
] = await Promise.all([...]);
```

### Data Volume

| Query | Rows (1M) | Rows (3M) |
|-------|-----------|-----------|
| OHLCV Extended | 20 | 60 |
| MRS History | 20 | 60 |
| Sector MRS | 11 × 20 | 11 × 60 |
| VIX History | 20 | 60 |
| Analyst Actions | ~5-10 | ~5-10 |

---

## Component Breakdown

### Header Section

**Elements**:
- Ticker symbol (H2, bold)
- Company name + Sector + Rank
- Current price (large, tabular-nums)
- Day change (colored, with +/- sign)

**Data Source**: `getStockDetail()`

### P1: Price/Volume Chart

**Component**: `ChartWithReport` → `PriceVolumeChart`

**Features**:
- Dual mode: Insight (line) / OHLCV (candlestick)
- Three ranges: 1M (20d) / 2M (40d) / 3M (60d)
- Verdict badges clickable → opens ReportSheet

**Data Source**: `getStockOHLCVExtended()`, `getVIXHistory()`

### P2: Sector Rotation Chart

**Component**: `SectorMRSChart`

**Features**:
- All 11 GICS sectors
- MRS 20 score as bar width
- Current stock's sector highlighted with star

**Data Source**: `getSectorMRSHistory()`

### P3: MRS Trajectory Chart

**Component**: `MRSTrajectoryChart`

**Features**:
- Three lines: MRS 5, 10, 20
- NASDAQ comparison (right axis)
- Reference zones: Entry (3%), Confirm (4%), Exhaustion (8.5%)

**Data Source**: `getMRSHistory()`, `getNASDAQHistory()`

### Analyst Cards

**Components**: Inline cards (not separate components)

**Analyst Actions**:
- Recent upgrades/downgrades
- Trend: BULLISH / NEUTRAL / BEARISH
- Count summary (▲ Up, ▼ Down, Hold)

**Price Targets**:
- Recent target changes
- Average change percentage
- Direction indicator

**Data Source**: `getAnalystActions()`, `getAnalystTargets()`

### Trade Setup Card

**Component**: `TradeSetupCard`

**Elements**:
- Entry price (current close)
- Target price (from L3 contract)
- Stop price (from L3 contract)
- Risk/Reward ratio
- Conviction score (0-100)
- Position size suggestion

**Data Source**: `getL3Contracts()`

### Risk Metrics Card

**Elements**:
- Sharpe ratio (20d) with classification
- Volatility (20d) with classification
- Beta (60d) with classification
- Alpha (20d) with classification

**Data Source**: `getStockDetail()`

---

## Interactions

### Range Toggle (1M/2M/3M)

**Trigger**: Button click
**Effect**:
- URL param update (`?range=40`)
- Page re-renders with new data range
- Chart adjusts compact mode styling

### Mode Toggle (Insight/OHLCV)

**Trigger**: Button click
**Effect**:
- Local state change
- Chart re-renders in new mode
- No server round-trip

### Verdict Click

**Trigger**: Click on verdict badge in chart
**Effect**:
- Opens ReportSheet (slide-out panel)
- Fetches markdown report from `/api/reports/[ticker]`
- Shows L3 contract details

### Date Navigation (in ReportSheet)

**Trigger**: Arrow buttons in report header
**Effect**:
- Fetches available dates for ticker
- Navigates to previous/next report date
- Updates verdict display

---

## Responsive Behavior

### Desktop (≥ 1024px)

- Full 2-column layout
- All charts at full size
- Side-by-side cards

### Tablet (768-1023px)

- P1 chart full width
- P2/P3 charts stacked or side-by-side
- Cards in 2-column grid

### Mobile (< 768px)

- All elements single column
- Charts at reduced height
- Scrollable card sections

---

## Error States

### Stock Not Found

- Show 404 page
- Suggest similar tickers

### No L3 Contract

- Hide Trade Setup card OR
- Show "No signal" state
- Verdict badges show `?|?`

### Missing Data

- Individual sections show "No data" state
- Other sections still render

---

## Performance

### Target Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| TTFB | < 200ms | Server queries parallelized |
| LCP | < 1.5s | Charts are LCP element |
| TBT | < 100ms | Minimal client-side JS |

### Optimization Techniques

1. Parallel database queries
2. Server-side rendering (no loading states)
3. React 19 compiler optimizations
4. Prepared SQL statements
