# Desk - Quant Trading Dashboard

**Implementation Status Document**
**Last Updated:** 2025-12-17

---

## Project Overview

Next.js 16 frontend for US equity quant trading visualization. Consumes data from `/Volumes/Data/quant/`.

| Item | Value |
|------|-------|
| **Backend** | `/Volumes/Data/quant/` |
| **Database** | `/Volumes/Data/quant/data/stocks.db` (SQLite) |
| **Reports** | `/Volumes/Data/quant/reports_10/` and `/Volumes/Data/quant/reports_20/` |
| **Framework** | Next.js 16.0.10, React 19.2.1 |

---

## Tech Stack

```json
{
  "dependencies": {
    "next": "16.0.10",
    "react": "19.2.1",
    "better-sqlite3": "^12.5.0",
    "recharts": "^3.5.1",
    "date-fns": "^4.1.0",
    "pino": "^10.1.0",
    "uuid": "^13.0.0",
    "lucide-react": "^0.561.0",
    "react-markdown": "^10.1.0"
  }
}
```

**Removed (unused):** `lightweight-charts`, `zod`, `zustand`, `@opentelemetry/api`, `@vercel/otel`

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE

- [x] Create Next.js 16 project with React Compiler
- [x] Install dependencies (better-sqlite3, charts, pino, shadcn/ui)
- [x] Configure SQLite connection (read-only)
- [x] Setup Pino logger
- [x] Create layout (sidebar, header with trading date)
- [x] Implement `/api/trading-date` route
- [x] Implement `/api/stocks` route (list + search)
- [x] Implement `/api/stocks/[ticker]` route
- [x] Dashboard page (placeholder)
- [x] Stock screener page with data table
- [x] Stock detail page (basic)
- [x] Dark mode enabled

### Phase 2: Charts & Visualization ✅ COMPLETE

- [x] Price/Volume chart with Recharts (Line + Candlestick modes)
- [x] Volume percentile coloring (high/normal/low)
- [x] VIX regime indicators (top row)
- [x] L3 verdict badges (clickable)
- [x] Gap indicators with P/A badges
- [x] OFD pattern codes
- [x] MRS trajectory chart (MRS 5/10/20 + NASDAQ)
- [x] Sector rotation chart (11 sectors)
- [x] Sector rank history
- [x] Chart range toggle (1M/2M/3M)
- [x] Responsive chart sizing (compact mode for 3M)

### Phase 3: Reports & Analysis ✅ COMPLETE

- [x] Report sheet (slide-out panel)
- [x] L3 contract display (thesis, conviction, risk/reward)
- [x] Report date navigation (prev/next arrows)
- [x] Dynamic verdict sync with date
- [x] Analyst actions summary (upgrades/downgrades)
- [x] Price target summary
- [x] Trade setup card (entry/stop/target)
- [x] Risk metrics card (Sharpe, volatility, beta, alpha)

### Phase 4: Dashboard & Polish 🔄 IN PROGRESS

- [x] VIX regime display in header
- [x] Date picker in header
- [ ] Dashboard with market overview
- [ ] Portfolio summary from database
- [ ] Positions table with P&L
- [ ] Stock search with autocomplete
- [ ] Sectors heatmap page

### Phase 5: Position Management (Future)

- [ ] Create/update positions
- [ ] Order entry
- [ ] Trade journal
- [ ] AI chat integration

---

## Project Structure

```
desk/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Dashboard
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Tailwind + OKLch colors
│   │   ├── stocks/
│   │   │   ├── page.tsx                # Stock screener
│   │   │   ├── stock-table.tsx         # Client table component
│   │   │   └── [ticker]/
│   │   │       └── page.tsx            # Stock detail (SSR)
│   │   ├── sectors/
│   │   │   └── page.tsx                # Sector analysis
│   │   └── api/
│   │       ├── trading-date/route.ts
│   │       ├── trading-dates/route.ts
│   │       ├── stocks/
│   │       │   ├── route.ts
│   │       │   └── [ticker]/route.ts
│   │       ├── sectors/route.ts
│   │       └── reports/
│   │           └── [ticker]/
│   │               ├── route.ts        # GET report content
│   │               └── dates/route.ts  # GET available dates
│   │
│   ├── components/
│   │   ├── charts/
│   │   │   ├── price-volume-chart.tsx  # Main chart (~1500 lines)
│   │   │   ├── sector-mrs-chart.tsx    # Sector comparison
│   │   │   ├── mrs-trajectory-chart.tsx # Momentum trajectory
│   │   │   ├── sector-rotation-chart.tsx
│   │   │   └── index.ts
│   │   ├── ui/                         # shadcn components
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── popover.tsx
│   │   │   └── calendar.tsx
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   └── header.tsx
│   │   ├── chart-with-report.tsx       # Chart + report sheet wrapper
│   │   ├── report-sheet.tsx            # L3 report panel
│   │   ├── trade-setup-card.tsx
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   │
│   └── lib/
│       ├── db.ts                       # SQLite singleton
│       ├── logger.ts                   # Pino logger
│       ├── utils.ts                    # cn() utility
│       ├── formatters.ts               # Number/volume formatting
│       ├── gap-indicators.ts           # Gap/pattern helpers
│       └── queries/
│           ├── stocks.ts               # Stock data queries
│           ├── sectors.ts              # Sector queries
│           └── trading-days.ts         # Date/VIX/NASDAQ queries
│
├── docs/
│   └── design/                         # Design documentation
│       ├── README.md
│       ├── ARCHITECTURE.md
│       ├── foundations/
│       │   ├── colors.md
│       │   └── typography.md
│       ├── pages/
│       │   └── stock-detail.md
│       └── components/
│           └── price-volume-chart.md
│
├── .env.local
├── CLAUDE.md                           # Project instructions
├── HANDOVER.md                         # This file
└── package.json
```

---

## Database Schema

### Trading Date (Single Source of Truth)
```sql
SELECT date FROM trading_days WHERE day_rank = 1
```

### Core Data Tables

| Table | Purpose |
|-------|---------|
| `stocks_ohlcv` | Price data |
| `stocks_indicators` | MRS, momentum, gaps |
| `stocks_technicals` | RSI, MACD, ATR |
| `stocks_metadata` | Ticker, name, sector |
| `candle_descriptors` | OFD patterns |
| `l3_contracts_10` | L3 verdicts (10-day) |
| `l3_contracts_20` | L3 verdicts (20-day) |
| `sector_etf_indicators` | Sector MRS scores |
| `market_regime` | VIX, regime classification |

**Portfolio Account ID:** `283445330105777479`

---

## Key Design Decisions

### Chart Typography (Verdict Badges)
| View | Font Size | Weight | Format |
|------|-----------|--------|--------|
| 1M (20d) | 10pt | bold | `A\|B` |
| 2M (40d) | 10pt | bold | `A\|B` |
| 3M (60d) | 9pt | bold | `AB` |

### Color System
- **Bullish/Buy**: `#22c55e` (green)
- **Bearish/Avoid**: `#ef4444` (red)
- **Neutral/Hold**: `#9ca3af` (gray)
- **Info**: `#3b82f6` (blue)

### Volume Percentile Colors
- ≥75%: Full opacity
- 25-75%: 60% opacity
- <25%: 30% opacity

---

## Quick Commands

```bash
# Start dev server
pnpm dev

# Test database
sqlite3 /Volumes/Data/quant/data/stocks.db "SELECT date FROM trading_days WHERE day_rank = 1"

# Type check
pnpm exec tsc --noEmit
```

---

## Known Issues / Gotchas

1. **better-sqlite3** requires native rebuild: `npm rebuild better-sqlite3`
2. **Table name:** Use `stocks_metadata` not `stock_base`
3. **Column name:** Use `name` not `company_name` in stocks_metadata
4. **Column name:** Use `macd_line` not `macd` in stocks_technicals
5. **Trading date:** Always use `trading_days` table, never `MAX(date)`

---

## Documentation

| Document | Location |
|----------|----------|
| Architecture | `docs/design/ARCHITECTURE.md` |
| Colors | `docs/design/foundations/colors.md` |
| Typography | `docs/design/foundations/typography.md` |
| Stock Detail Page | `docs/design/pages/stock-detail.md` |
| PriceVolumeChart | `docs/design/components/price-volume-chart.md` |
| Project Instructions | `CLAUDE.md` |
| Full Planning Doc | `/Volumes/Data/quant/docs/frontend/FRONTEND_PLAN.md` |

---

**Phase 3 Complete - Charts, Reports, Analysis all working!**
