# Desk - Trading Dashboard Design Specification

**Version:** 1.0
**Date:** 2025-12-13
**Status:** Approved

---

## Executive Summary

Build a Next.js 16 frontend to visualize the quant trading platform data. This is a **read-only** visualization layer consuming data from `/Volumes/Data/quant/`.

**Key Principle:** Design-spec driven development. This document defines architecture before any code is written.

---

## Technology Stack

### Core Framework

| Technology | Version | Rationale |
|------------|---------|-----------|
| **Next.js** | 16.x | Turbopack stable, React Compiler, improved caching |
| **React** | 19.x | Server Components, new hooks |
| **TypeScript** | 5.x strict | Type safety, better DX |
| **pnpm** | latest | Fast, disk-efficient |

### UI Layer

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Tailwind CSS** | Styling | Utility-first, dark mode support |
| **shadcn/ui** | Components | Accessible, customizable, Recharts integration |
| **TradingView Lightweight** | Candlestick charts | Best performance for OHLCV |
| **Recharts** | Bar/line/area charts | shadcn integration, React-native |
| **Framer Motion** | Animations | Sector rotation "bar chart race" |

### Data Layer

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **better-sqlite3** | Database access | Synchronous, read-only, no API layer |
| **Zod** | Validation | TypeScript-first schemas |
| **Pino** | Logging | Structured JSON, production-grade |
| **date-fns** | Date formatting | Lightweight, tree-shakeable |

### State Management

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Zustand** | Client state | Simple, no boilerplate |
| **React Context** | Theme only | Dark/light mode toggle |

### NOT Using (Explicit Decisions)

| Technology | Reason |
|------------|--------|
| **Vercel AI SDK** | Hides orchestration, reduces observability |
| **Server Actions** | Harder to instrument, use Route Handlers |
| **axios** | Native fetch sufficient for read-only |
| **Redux** | Overkill for this scope |
| **Prisma** | SQLite with better-sqlite3 is simpler |

---

## Architecture Patterns

### From cli-nextjs Reference

| Pattern | Application in Desk |
|---------|---------------------|
| **Route Handlers** | All `/api/*` endpoints |
| **Pino 2-Logger** | Base logger + request logger with correlation |
| **Zod Validation** | Query params, API responses |
| **RSC by Default** | Pages are Server Components |
| **CC for Interactivity** | Charts, forms, state |
| **Single Responsibility** | One component = one job |

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Client)                                           │
│  ┌──────────────────────┐  ┌────────────────────────────┐  │
│  │  Pages (RSC)          │  │  Charts (CC)               │  │
│  │  - Server-rendered    │  │  - TradingView             │  │
│  │  - Static shell       │  │  - Recharts                │  │
│  └──────────────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓ fetch()
┌─────────────────────────────────────────────────────────────┐
│  API Layer (Route Handlers)                                 │
│  GET /api/stocks/[ticker]     - Stock detail               │
│  GET /api/sectors             - Sector MRS                 │
│  GET /api/positions           - Portfolio                  │
│  GET /api/macro               - Market regime              │
│  GET /api/l3/[ticker]         - L3 contract JSON           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Service Layer                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ lib/db.ts      │  │ lib/queries/*  │  │ lib/l3.ts    │  │
│  │ - Connection   │  │ - stocks.ts    │  │ - JSON files │  │
│  │ - Read-only    │  │ - sectors.ts   │  │ - Contract   │  │
│  └────────────────┘  │ - portfolio.ts │  │   parsing    │  │
│                      └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Data Sources (Read-Only)                                   │
│  ┌────────────────────┐  ┌──────────────────────────────┐  │
│  │ stocks.db (SQLite) │  │ L3 JSON files                │  │
│  │ /Volumes/Data/     │  │ /data/contracts/{date}/      │  │
│  │ quant/data/        │  │ l3_10_{ticker}.json          │  │
│  └────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
desk/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Dashboard (RSC)
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Tailwind + dark mode
│   │   ├── sectors/
│   │   │   └── page.tsx                # Sector heatmap
│   │   ├── stocks/
│   │   │   ├── page.tsx                # Stock list/search
│   │   │   └── [ticker]/
│   │   │       └── page.tsx            # Stock detail (4 panels)
│   │   ├── positions/
│   │   │   └── page.tsx                # Portfolio
│   │   ├── chat/
│   │   │   └── page.tsx                # AI chat
│   │   └── api/
│   │       ├── stocks/
│   │       │   ├── route.ts            # GET /api/stocks
│   │       │   └── [ticker]/
│   │       │       └── route.ts        # GET /api/stocks/[ticker]
│   │       ├── sectors/
│   │       │   └── route.ts            # GET /api/sectors
│   │       ├── positions/
│   │       │   └── route.ts            # GET /api/positions
│   │       ├── macro/
│   │       │   └── route.ts            # GET /api/macro
│   │       └── l3/
│   │           └── [ticker]/
│   │               └── route.ts        # GET /api/l3/[ticker]
│   ├── components/
│   │   ├── ui/                         # shadcn components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx             # Navigation
│   │   │   ├── Header.tsx              # Top bar
│   │   │   └── ThemeToggle.tsx         # Dark/light
│   │   ├── charts/
│   │   │   ├── PriceVolumeChart.tsx    # Panel 1 (TradingView)
│   │   │   ├── SectorMRSChart.tsx      # Panel 2 (Recharts)
│   │   │   ├── MRSTrajectoryChart.tsx  # Panel 3 (Recharts)
│   │   │   └── SectorRotationChart.tsx # Animated bar race
│   │   ├── stock/
│   │   │   ├── ExecutionPanel.tsx      # Panel 4 (4 quadrants)
│   │   │   ├── ReportPanel.tsx         # Sliding L3 report
│   │   │   └── VerdictBadge.tsx        # BUY/HOLD/SELL badge
│   │   ├── dashboard/
│   │   │   ├── MarketStatus.tsx        # VIX regime banner
│   │   │   ├── PortfolioCard.tsx       # Quick P&L
│   │   │   └── SignalsCount.tsx        # Today's signals
│   │   └── positions/
│   │       ├── PositionsTable.tsx      # Holdings grid
│   │       └── SectorPieChart.tsx      # Exposure chart
│   ├── lib/
│   │   ├── db.ts                       # SQLite connection
│   │   ├── logger.ts                   # Pino setup
│   │   ├── queries/
│   │   │   ├── stocks.ts               # Stock queries
│   │   │   ├── sectors.ts              # Sector queries
│   │   │   ├── portfolio.ts            # Portfolio queries
│   │   │   └── macro.ts                # Market regime
│   │   ├── l3.ts                       # L3 JSON loader
│   │   └── utils.ts                    # Helpers
│   ├── types/
│   │   ├── stock.ts                    # OHLCV, indicators
│   │   ├── sector.ts                   # Sector MRS
│   │   ├── portfolio.ts                # Positions
│   │   ├── l3.ts                       # L3 contract
│   │   └── api.ts                      # API responses
│   └── stores/
│       └── ui.ts                       # Zustand UI state
├── docs/
│   └── DESIGN_SPEC.md                  # This document
├── .env.local                          # Environment vars
├── next.config.ts                      # Next.js config
├── tailwind.config.ts                  # Tailwind config
├── tsconfig.json                       # TypeScript config
└── package.json
```

---

## Database Layer Design

### Connection (lib/db.ts)

```typescript
// Singleton pattern - read-only connection
import Database from 'better-sqlite3'
import { logger } from './logger'

const DB_PATH = process.env.DB_PATH || '/Volumes/Data/quant/data/stocks.db'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true })
    logger.info({ path: DB_PATH }, 'Database connected')
  }
  return db
}

// CRITICAL: Always use trading_days for latest date
export function getLatestTradingDate(): string {
  const result = getDb()
    .prepare('SELECT date FROM trading_days WHERE day_rank = 1')
    .get() as { date: string }
  return result.date
}
```

### Query Pattern (lib/queries/stocks.ts)

```typescript
import { getDb, getLatestTradingDate } from '../db'
import { z } from 'zod'

// Zod schema for validation
export const StockDetailSchema = z.object({
  date: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  mrs_5: z.number().nullable(),
  mrs_10: z.number().nullable(),
  mrs_20: z.number().nullable(),
  // ... more fields
})

export type StockDetail = z.infer<typeof StockDetailSchema>

export function getStockOHLCV(ticker: string, days: number = 20): StockDetail[] {
  const db = getDb()
  const date = getLatestTradingDate()

  return db.prepare(`
    SELECT
      o.date, o.open, o.high, o.low, o.close, o.volume,
      i.mrs_5, i.mrs_10, i.mrs_20, i.mrs_20_cs, i.mrs_20_ts,
      i.gap_pct, i.gap_type, i.volume_10_ts,
      c.ofd_code, c.conclusion, c.pattern, c.reversal_confirmed,
      t.atr_14, t.rsi_14, t.macd, t.macd_signal,
      l10.verdict as verdict_10, l10.conviction as conviction_10,
      l20.verdict as verdict_20, l20.conviction as conviction_20
    FROM stocks_ohlcv o
    LEFT JOIN stocks_indicators i ON o.ticker = i.ticker AND o.date = i.date
    LEFT JOIN candle_descriptors c ON o.ticker = c.ticker AND o.date = c.date
    LEFT JOIN stocks_technicals t ON o.ticker = t.ticker AND o.date = t.date
    LEFT JOIN l3_contracts_10 l10 ON o.ticker = l10.ticker AND o.date = l10.trading_date
    LEFT JOIN l3_contracts_20 l20 ON o.ticker = l20.ticker AND o.date = l20.trading_date
    WHERE o.ticker = ? AND o.date <= ?
    ORDER BY o.date DESC
    LIMIT ?
  `).all(ticker.toUpperCase(), date, days)
}
```

---

## API Route Design

### Pattern (Route Handler + Zod)

```typescript
// src/app/api/stocks/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStockOHLCV, getSectorComparison, getMRSHistory } from '@/lib/queries/stocks'
import { getL3Contract } from '@/lib/l3'
import { logger } from '@/lib/logger'

const ParamsSchema = z.object({
  ticker: z.string().min(1).max(5).toUpperCase(),
})

const QuerySchema = z.object({
  days: z.coerce.number().min(5).max(60).default(20),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const startTime = Date.now()

  try {
    // Validate params
    const { ticker } = ParamsSchema.parse(await params)
    const { searchParams } = new URL(request.url)
    const { days } = QuerySchema.parse({ days: searchParams.get('days') })

    // Fetch data
    const [ohlcv, sectors, mrsHistory, l3] = await Promise.all([
      getStockOHLCV(ticker, days),
      getSectorComparison(ticker),
      getMRSHistory(ticker, days),
      getL3Contract(ticker),
    ])

    const response = {
      ticker,
      ohlcv,
      sectors,
      mrsHistory,
      l3,
      meta: {
        latencyMs: Date.now() - startTime,
        days,
      }
    }

    logger.info({ ticker, latencyMs: response.meta.latencyMs }, 'Stock detail fetched')

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 })
    }
    logger.error({ error }, 'Stock detail fetch failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## Component Architecture

### Server vs Client Components

| Component | Type | Rationale |
|-----------|------|-----------|
| `page.tsx` (all) | RSC | Static shell, data fetching |
| `layout.tsx` | RSC | Metadata, fonts |
| `Sidebar.tsx` | RSC | Static navigation |
| `Header.tsx` | CC | Theme toggle, search |
| `PriceVolumeChart.tsx` | CC | TradingView requires DOM |
| `SectorMRSChart.tsx` | CC | Recharts requires DOM |
| `ReportPanel.tsx` | CC | Sliding animation, state |
| `ExecutionPanel.tsx` | RSC | Static display |
| `PositionsTable.tsx` | CC | Sorting, filtering |

### Chart Components

**Panel 1: Price + Volume (TradingView Lightweight)**
```typescript
'use client'
import { createChart, IChartApi, CandlestickData } from 'lightweight-charts'
import { useEffect, useRef } from 'react'

interface Props {
  data: CandlestickData[]
  volumeData: { time: string; value: number; color: string }[]
}

export function PriceVolumeChart({ data, volumeData }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: { background: { color: 'transparent' } },
      grid: { vertLines: { color: '#e1e1e1' }, horzLines: { color: '#e1e1e1' } },
      timeScale: { timeVisible: true },
    })

    const candleSeries = chart.addCandlestickSeries()
    candleSeries.setData(data)

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    volumeSeries.setData(volumeData)

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    chartRef.current = chart

    return () => chart.remove()
  }, [data, volumeData])

  return <div ref={containerRef} className="h-[400px] w-full" />
}
```

**Panel 2: Sector Rotation Animation (Framer Motion)**
```typescript
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'

interface SectorData {
  etf: string
  name: string
  mrs_20: number
  rank: number
  prevRank: number
}

interface Props {
  data: SectorData[]
  highlightSector?: string
}

export function SectorRotationChart({ data, highlightSector }: Props) {
  const sorted = useMemo(() =>
    [...data].sort((a, b) => b.mrs_20 - a.mrs_20),
    [data]
  )

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {sorted.map((sector, index) => (
          <motion.div
            key={sector.etf}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`flex items-center gap-2 p-2 rounded ${
              sector.etf === highlightSector ? 'ring-2 ring-yellow-400' : ''
            }`}
          >
            <span className="w-12 font-mono text-sm">{sector.etf}</span>
            <div className="flex-1 h-6 bg-gray-200 rounded overflow-hidden">
              <motion.div
                className={`h-full ${sector.mrs_20 > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.abs(sector.mrs_20) * 10}%` }}
              />
            </div>
            <span className="w-16 text-right font-mono">
              {sector.mrs_20 > 0 ? '+' : ''}{sector.mrs_20.toFixed(2)}%
            </span>
            <RankDelta current={index + 1} previous={sector.prevRank} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
```

---

## Type Definitions

### Core Types (types/stock.ts)

```typescript
// OHLCV with indicators
export interface StockOHLCV {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  mrs_5: number | null
  mrs_10: number | null
  mrs_20: number | null
  mrs_20_cs: number | null  // Cross-sectional percentile
  mrs_20_ts: number | null  // Time-series percentile
  gap_pct: number | null
  gap_type: 'UP' | 'DOWN' | null
  volume_10_ts: number | null
  ofd_code: string | null
  conclusion: string | null
  pattern: string | null
  reversal_confirmed: 'BULLISH_CONFIRMED' | 'BEARISH_CONFIRMED' | null
  atr_14: number | null
  rsi_14: number | null
  verdict_10: 'BUY' | 'HOLD' | 'SELL' | 'AVOID' | null
  verdict_20: 'BUY' | 'HOLD' | 'SELL' | 'AVOID' | null
}
```

### L3 Contract (types/l3.ts)

```typescript
export type Verdict = 'BUY' | 'HOLD' | 'SELL' | 'AVOID'
export type Thesis = 'STRENGTH' | 'VALUE' | 'REVERSION' | 'PARABOLIC' | 'NEUTRAL'
export type Conviction = 'HIGH' | 'MEDIUM' | 'LOW'

export interface L3Contract {
  ticker: string
  trading_date: string
  verdict: Verdict
  thesis: Thesis
  conviction: Conviction
  conviction_score: number  // 0-100
  position_pct: number
  entry_price: number
  stop_loss: number
  target_price: number | null
  risk_reward: number
  thesis_implications: {
    horizon: string
    risk_profile: string
    stop_type: string
    when_wrong: string
  }
  summary: {
    technical: string
    fundamental: string
    risks: string[]
    catalysts: string[]
    news_sentiment: string
  }
}
```

---

## Environment Variables

```bash
# .env.local
DB_PATH="/Volumes/Data/quant/data/stocks.db"
CONTRACTS_PATH="/Volumes/Data/quant/data/contracts"
PORTFOLIO_ACCOUNT_ID="283445330105777479"

# Logging
LOG_LEVEL="info"

# Optional - for AI Chat
ANTHROPIC_API_KEY="..."
```

---

## Implementation Phases

### Phase 1: Foundation (Must Complete First)
- [ ] Create Next.js 16 project with TypeScript + Tailwind
- [ ] Setup shadcn/ui (button, card, table, badge, tabs)
- [ ] Configure better-sqlite3 + Pino logging
- [ ] Create lib/db.ts with connection + getLatestTradingDate()
- [ ] Create basic layout (Sidebar, Header)
- [ ] Implement `/api/stocks/[ticker]` route
- [ ] Basic stock detail page (data display only)

### Phase 2: Charts
- [ ] Install TradingView Lightweight Charts
- [ ] Panel 1: PriceVolumeChart component
- [ ] Panel 3: MRSTrajectoryChart (Recharts)
- [ ] Panel 2: SectorMRSChart (horizontal bars)
- [ ] Panel 4: ExecutionPanel (4 quadrants)

### Phase 3: Stock Detail Polish
- [ ] Sliding ReportPanel with L3 markdown
- [ ] VerdictBadge component (BUY/HOLD/SELL/AVOID)
- [ ] OFD code annotations on chart
- [ ] Gap pattern markers
- [ ] Language toggle (EN/ZH/JA) for L3 reports

### Phase 4: Dashboard & Positions
- [ ] Dashboard page with MarketStatus
- [ ] PortfolioCard with P&L
- [ ] Positions table from Futu data
- [ ] Sector exposure pie chart

### Phase 5: Search & Polish
- [ ] Stock search/filter page
- [ ] Sector heatmap page
- [ ] Dark mode toggle
- [ ] Mobile responsiveness

### Phase 6: AI Chat
- [ ] Chat interface (reuse cli-nextjs patterns)
- [ ] L3 contract as context
- [ ] Stock context sidebar

---

## Design Decisions (Confirmed)

| Decision | Choice | Notes |
|----------|--------|-------|
| **Sector Animation** | Auto-play + controls | Animation starts on load, with play/pause/scrub |
| **Translation** | Include in MVP | Language toggle (EN/ZH/JA) in Phase 3 |
| **AI Chat** | Include in MVP | Basic chat with L3 context |
| **shadcn Components** | Minimal set | button, card, table, badge, tabs, input - add as needed |

---

## Success Criteria

1. **Dashboard loads in <2s** with market status and portfolio summary
2. **Stock detail renders 4 panels** with real SQLite data
3. **Charts are interactive** (zoom, pan, tooltips)
4. **L3 report panel slides** in/out smoothly
5. **Dark mode works** across all components
6. **No TypeScript errors** in strict mode
7. **Pino logs** show request correlation

---

## References

| Resource | Location |
|----------|----------|
| Full planning doc | `/Volumes/Data/quant/docs/frontend/FRONTEND_PLAN.md` |
| L3 contract schema | `/Volumes/Data/quant/docs/intel/03_l3_stock.md` |
| Python reference | `/Volumes/Data/quant/cli/dashboards/stock_summary.py` |
| cli-nextjs patterns | `~/Google Drive/cli-nextjs/docs/` |
