# Desk Trading Dashboard - Architecture Overview

## Executive Summary

Desk is a **read-only** Next.js 16 frontend for US equity quant trading visualization, consuming data from the `/Volumes/Data/quant/` pipeline. The architecture prioritizes **information density**, **fast rendering**, and **type safety**.

---

## Core Architecture Decisions

### 1. Rendering Strategy: Server-First with Client Charts

**Decision**: Async server components fetch all data; charts render client-side.

**Tradeoffs**:
| Approach | Pros | Cons |
|----------|------|------|
| **Chosen: SSR + Client Charts** | No loading spinners, SEO-ready, fast TTFB | Larger initial HTML, hydration cost |
| Alternative: Full CSR | Smaller initial bundle | Loading states, no SEO, slower perceived load |
| Alternative: Full SSR | Fastest initial paint | Can't use Recharts (needs DOM) |

**Rationale**: Stock detail pages need 10+ data queries. Server-side fetch eliminates waterfall requests. Recharts requires client-side rendering for interactivity.

### 2. Database Access: Synchronous SQLite

**Decision**: Use `better-sqlite3` in read-only mode with synchronous API.

**Tradeoffs**:
| Approach | Pros | Cons |
|----------|------|------|
| **Chosen: better-sqlite3 sync** | Simple code, no connection pool, fast | Blocks event loop (acceptable for read-only) |
| Alternative: Prisma/Drizzle | ORM features, migrations | Overkill for read-only, async overhead |
| Alternative: HTTP API to quant | Decoupled | Network latency, another service to maintain |

**Rationale**: Read-only access to existing SQLite DB. Sync API simplifies server components. No writes = no lock contention.

### 3. State Management: Minimal

**Decision**: React local state + Context for theme. No Redux/Zustand for data.

**Tradeoffs**:
| Approach | Pros | Cons |
|----------|------|------|
| **Chosen: Local state** | Simple, no boilerplate, React 19 optimized | State not shared across routes |
| Alternative: Zustand | Lightweight global state | Unnecessary for server-fetched data |
| Alternative: Redux | Time-travel debugging | Massive overkill, boilerplate |

**Rationale**: Data comes from server props, not client fetches. Only UI state (chart mode, panel open) needs local state.

### 4. Charting: Recharts over TradingView Lightweight

**Decision**: Use Recharts for all charts (originally planned TradingView for candlesticks).

**Tradeoffs**:
| Approach | Pros | Cons |
|----------|------|------|
| **Chosen: Recharts** | React-native, composable, customizable layers | More code for candlesticks |
| Alternative: TradingView Lightweight | Built-in candlesticks, crosshair | Less customizable, two libraries |
| Alternative: D3 direct | Maximum control | Verbose, imperative, React integration pain |

**Rationale**: Need heavy customization (verdict badges, gap indicators, OFD codes, pattern annotations). Recharts' composable API allows layering. Single library for consistency.

### 5. Styling: Tailwind v4 with OKLch

**Decision**: Tailwind CSS v4 with OKLch color space for perceptual uniformity.

**Tradeoffs**:
| Approach | Pros | Cons |
|----------|------|------|
| **Chosen: Tailwind + OKLch** | Fast iteration, dark mode, perceptually uniform colors | Learning curve for OKLch |
| Alternative: CSS Modules | Scoped by default | Verbose, no utility classes |
| Alternative: styled-components | Co-located styles | Runtime cost, SSR complexity |

**Rationale**: OKLch ensures consistent perceived brightness across hues (critical for data viz). Tailwind utilities speed up development.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ PriceVolume  │  │ SectorMRS    │  │ MRSTrajectory│  Charts       │
│  │ Chart        │  │ Chart        │  │ Chart        │  (Recharts)   │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│         ↑                 ↑                 ↑                        │
│         └─────────────────┴─────────────────┘                        │
│                           │                                          │
│                    Props from Server                                 │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js 16 Server                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Async Server Components (SSR)                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │   │
│  │  │ /stocks     │  │ /stocks/    │  │ /sectors    │           │   │
│  │  │ (list)      │  │ [ticker]    │  │             │           │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Query Functions                             │   │
│  │  stocks.ts │ sectors.ts │ market.ts │ trading-days.ts        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              better-sqlite3 (read-only)                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│              /Volumes/Data/quant/data/stocks.db                      │
│                    (External - Read Only)                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # REST endpoints + AI chat
│   ├── page.tsx              # Homepage (redirects to /market)
│   ├── market/               # Market overview dashboard
│   ├── stocks/               # Stock list + [ticker] detail
│   ├── sectors/              # Sector rotation analysis
│   ├── indices/              # Index OHLCV charts
│   ├── chat/                 # AI Advisor
│   ├── terms/                # Terms of service
│   └── layout.tsx            # Root layout with sidebar
├── components/
│   ├── charts/               # Recharts-based visualizations
│   │   ├── price-volume-chart.tsx   # Main chart (~1500 lines)
│   │   ├── sector-mrs-chart.tsx     # Sector comparison
│   │   └── mrs-trajectory-chart.tsx # Momentum trajectory
│   ├── market/               # Market overview components
│   │   ├── regime-banner.tsx        # Regime display with transition
│   │   ├── index-card.tsx           # Index price cards
│   │   ├── vix-gauge.tsx            # VIX visualization
│   │   ├── breadth-bar.tsx          # Market breadth indicator
│   │   ├── yield-curve.tsx          # Treasury yield curve
│   │   └── indices-ohlcv-grid.tsx   # 4-index chart grid
│   ├── sectors/              # Sector analysis components
│   ├── ui/                   # shadcn/ui primitives
│   ├── layout/               # Sidebar, header
│   └── report-sheet.tsx      # L3 verdict panel
└── lib/
    ├── db.ts                 # SQLite singleton
    ├── queries/              # Type-safe query functions
    │   ├── stocks.ts         # Stock queries + StockOHLCVExtended
    │   ├── sectors.ts        # Sector rotation queries
    │   ├── market.ts         # L1/L2 contracts, indices, sentiment
    │   └── trading-days.ts   # Trading date helpers
    └── utils.ts              # Tailwind cn() helper
```

---

## Data Flow

### Stock Detail Page Load

```
1. User navigates to /stocks/NVDA?date=2025-12-15&range=40

2. Server Component executes (parallel queries):
   ├── getStockDetail(NVDA, 2025-12-15)
   ├── getStockOHLCVExtended(NVDA, 40, 2025-12-15)
   ├── getMRSHistory(NVDA, 40, 2025-12-15)
   ├── getSectorMRSHistory(40, 2025-12-15)
   ├── getRegimeHistory(40, 2025-12-15)
   ├── getAnalystActions(NVDA, 2025-12-15)
   ├── getAnalystTargets(NVDA, 2025-12-15)
   └── getL3Contracts(NVDA, 2025-12-15)

3. Server renders HTML with data embedded as props

4. Client hydrates, charts render with Recharts

5. User interactions (mode toggle, date nav) update local state
```

---

## Key Interfaces

### StockOHLCVExtended (Chart Data Point)

```typescript
interface StockOHLCVExtended extends StockOHLCV {
  // Volume indicators
  volume_10ma: number | null;
  volume_10_ts: number | null;       // Percentile 0-100

  // Gap indicators
  gap_type: string | null;           // "up_large" | "down_small" | etc
  gap_pct: number | null;
  gap_filled: string | null;         // "Y" | "N"
  gap_conclusion: string | null;     // "PREFER" | "AVOID"
  gap_interpretation: string | null;

  // MRS indicators
  mrs_20: number | null;
  mrs_20_ts: number | null;

  // OFD (Open-First-Day patterns)
  ofd_code: string | null;           // "+SLN" | "-DBH" | etc
  ofd_conclusion: string | null;
  ofd_interpretation: string | null;

  // Candle patterns
  pattern: string | null;            // "bullish_engulfing" | etc
  pattern_conclusion: string | null; // "PREFER" | "AVOID"
  pattern_interpretation: string | null;
  body_size_pct: number | null;
  candle_volume_ratio: number | null;
  upper_wick_ratio: number | null;
  lower_wick_ratio: number | null;

  // L3 Verdicts
  verdict_10: string | null;         // "BUY" | "AVOID" | "HOLD"
  verdict_20: string | null;

  // Moving Averages
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;

  // Technical indicators
  rsi_14: number | null;
  macd_line: number | null;
  macd_signal: number | null;
}
```

---

## Performance Characteristics

| Metric | Target | Actual |
|--------|--------|--------|
| TTFB (stock detail) | < 200ms | ~150ms |
| LCP | < 1.5s | ~1.2s |
| Chart render | < 100ms | ~80ms |
| SQLite query (single) | < 10ms | ~5ms |

**Optimizations Applied**:
- React 19 Compiler (automatic memoization)
- Turbopack dev server
- Prepared SQLite statements
- Read-only DB mode (no locks)

---

## Security Model

1. **Read-Only Database**: `better-sqlite3` opened with `{ readonly: true }`
2. **No User Input to SQL**: All queries use parameterized statements
3. **No Authentication**: Internal tool, network-level security assumed
4. **No Secrets in Code**: DB path in environment variable

---

## AI Advisor Module

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chat UI (React)                          │
│                 /src/app/chat/page.tsx                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ POST /api/chat
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Route                                  │
│              /src/app/api/chat/route.ts                     │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Claude    │───▶│    Tools    │───▶│  Database   │     │
│  │   Sonnet    │◀───│  Execution  │◀───│   Queries   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Available Tools

Claude has access to 8 tools:

| Tool | Purpose |
|------|---------|
| `get_market_overview` | L1 regime, VIX, breadth, macro summary, conflicts, guidance |
| `get_stock_detail` | 5-day trajectory with MRS, technicals, patterns, dual verdict |
| `search_stocks` | Find stocks by ticker prefix or company name |
| `find_stock_edge` | Filter by dual verdict combinations (m20_leading, dual_buy, etc.) |
| `get_trading_plan` | L3 contracts: entry, stop-loss, target, risk/reward |
| `get_analyst_sentiment` | Recent upgrades, downgrades, price target changes |
| `get_sector_rotation` | L2 sector rankings with signals and cycle phase |
| `web_search` | Tavily search for news, earnings, real-time info |

### Dual Verdict System (v6.0)

Stock selection uses backtested M10 × M20 verdict combinations (320K+ trades):

| Combination | NORMAL Win Rate | RISK_OFF Win Rate |
|-------------|-----------------|-------------------|
| M20 BUY alone | 62-63% | 78-83% |
| Both BUY | 59% | 85% |
| M10 BUY only | 59.5% | 61% |

Key insight: M20 is the primary signal; M10 provides early/confirming signals.

### Dependencies

```json
{
  "@anthropic-ai/sdk": "0.71.2"
}
```

---

## Future Considerations

### Planned Features
- **Position Management**: Will require write access (separate connection)
- **Real-time Updates**: WebSocket for live prices

### Scaling Path
- Current: Single SQLite file, single server
- Future: PostgreSQL for writes, read replicas for dashboard
