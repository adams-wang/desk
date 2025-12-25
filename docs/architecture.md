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
│  │  stocks.ts │ sectors.ts │ trading-days.ts                    │   │
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
│   ├── api/                  # Optional REST endpoints
│   ├── stocks/[ticker]/      # Stock detail (main page)
│   ├── sectors/              # Sector analysis
│   └── layout.tsx            # Root layout with sidebar
├── components/
│   ├── charts/               # Recharts-based visualizations
│   │   ├── price-volume-chart.tsx   # P1: Main chart (1500+ lines)
│   │   ├── sector-mrs-chart.tsx     # P2: Sector comparison
│   │   └── mrs-trajectory-chart.tsx # P3: Momentum trajectory
│   ├── ui/                   # shadcn/ui primitives
│   ├── layout/               # Sidebar, header
│   └── report-sheet.tsx      # L3 verdict panel
└── lib/
    ├── db.ts                 # SQLite singleton
    ├── queries/              # Type-safe query functions
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
   ├── getVIXHistory(40, 2025-12-15)
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
interface StockOHLCVExtended {
  // Price
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  prevClose: number | null;

  // Volume Analysis
  volume_10ma: number | null;
  volume_10_ts: number | null;      // Percentile 0-100
  candle_volume_ratio: number | null;

  // L3 Verdicts
  verdict_10: string | null;        // "BUY" | "AVOID" | "HOLD"
  verdict_20: string | null;

  // Gap Analysis
  gap_type: string | null;          // "up_large" | "down_small" | etc
  gap_conclusion: string | null;    // "PREFER" | "AVOID" | null

  // Pattern Analysis
  ofd_code: string | null;          // "+SLN" | "-DBH" | etc
  ofd_conclusion: string | null;    // "Support" | "Breakdown" | etc
  pattern_code: string | null;
  pattern_conclusion: string | null;

  // Moving Averages
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
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

## Future Considerations

### Planned Features
- **Position Management**: Will require write access (separate connection)
- **Real-time Updates**: WebSocket for live prices
- **AI Chat**: LLM integration for analysis

### Scaling Path
- Current: Single SQLite file, single server
- Future: PostgreSQL for writes, read replicas for dashboard
