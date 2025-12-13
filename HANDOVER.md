# Desk - Quant Trading Dashboard

**Implementation Status Document**
**Last Updated:** 2025-12-13

---

## Project Overview

Next.js 16 frontend for US equity quant trading visualization. Consumes data from `/Volumes/Data/quant/`.

| Item | Value |
|------|-------|
| **Backend** | `/Volumes/Data/quant/` |
| **Database** | `/Volumes/Data/quant/data/stocks.db` (SQLite) |
| **L3 Contracts** | `/Volumes/Data/quant/data/contracts/{date}/l3_10_{ticker}.json` |
| **Framework** | Next.js 16.0.10, React 19.2.1 |

---

## Tech Stack (Installed)

```json
{
  "dependencies": {
    "next": "16.0.10",
    "react": "19.2.1",
    "better-sqlite3": "^12.5.0",
    "lightweight-charts": "^4.2.0",
    "recharts": "^2.15.0",
    "zustand": "^5.0.0",
    "zod": "^3.24.0",
    "date-fns": "^4.1.0",
    "pino": "^9.6.0",
    "uuid": "^11.0.0",
    "lucide-react": "latest"
  }
}
```

---

## Database Schema (Corrected)

### Trading Date (Single Source of Truth)
```sql
SELECT date FROM trading_days WHERE day_rank = 1
```

### Core Data Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `stocks_ohlcv` | Price data | ticker, date, open, high, low, close, volume |
| `stocks_indicators` | MRS, momentum | mrs_5, mrs_10, mrs_20, mrs_20_cs, gap_pct, gap_type |
| `stocks_technicals` | ATR, RSI, MACD | atr_14, rsi_14, **macd_line**, macd_signal |
| `candle_descriptors` | OFD patterns | ofd_code, conclusion, pattern |
| `stocks_metadata` | Stock info | ticker, **name**, sector, industry |
| `l3_contracts_10` | L3 verdicts (MRS10) | ticker, trading_date, verdict, conviction |
| `l3_contracts_20` | L3 verdicts (MRS20) | ticker, trading_date, verdict, conviction |

**Note:** Table is `stocks_metadata` (not `stock_base`), column is `name` (not `company_name`), column is `macd_line` (not `macd`).

### Portfolio Tables

| Table | Purpose |
|-------|---------|
| `portfolio_positions` | Current holdings |
| `portfolio_deals_history` | Trade history |

**Portfolio Account ID:** `283445330105777479`

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE

- [x] Create Next.js 16 project with React Compiler
- [x] Install dependencies (better-sqlite3, charts, pino, shadcn/ui)
- [x] Configure SQLite connection (read/write, WAL mode)
- [x] Setup Pino logger with 2-logger pattern
- [x] Create layout (sidebar, header with trading date)
- [x] Implement `/api/trading-date` route
- [x] Implement `/api/stocks` route (list + search)
- [x] Implement `/api/stocks/[ticker]` route
- [x] Dashboard page (placeholder metrics)
- [x] Stock screener page with data table
- [x] Stock detail page (OHLCV, MRS, technicals, L3 verdicts)
- [x] Dark mode enabled

### Phase 2: Charts & Visualization

- [ ] TradingView Lightweight Charts (candlestick + volume)
- [ ] MRS trajectory chart (Recharts)
- [ ] Sector MRS comparison chart
- [ ] Real-time chart updates

### Phase 3: Dashboard & Positions

- [ ] Dashboard with real market status (VIX regime)
- [ ] Portfolio summary from database
- [ ] Positions table with P&L calculation
- [ ] Sector exposure pie chart

### Phase 4: Search & Polish

- [ ] Stock search with autocomplete
- [ ] Filter by sector, signal, verdict
- [ ] Sectors heatmap page
- [ ] AI chat integration

### Phase 5: Position Management (Future)

- [ ] Create/update positions
- [ ] Order entry
- [ ] Trade journal

---

## Project Structure (Actual)

```
desk/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Dashboard
│   │   ├── layout.tsx                  # Root layout (sidebar + header)
│   │   ├── globals.css                 # Tailwind + shadcn styles
│   │   ├── stocks/
│   │   │   ├── page.tsx                # Stock screener
│   │   │   ├── stock-table.tsx         # Client component
│   │   │   └── [ticker]/
│   │   │       └── page.tsx            # Stock detail
│   │   └── api/
│   │       ├── trading-date/
│   │       │   └── route.ts            # GET /api/trading-date
│   │       └── stocks/
│   │           ├── route.ts            # GET /api/stocks
│   │           └── [ticker]/
│   │               └── route.ts        # GET /api/stocks/[ticker]
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   └── input.tsx
│   │   └── layout/
│   │       ├── sidebar.tsx             # Navigation sidebar
│   │       └── header.tsx              # Header with trading date
│   │
│   └── lib/
│       ├── db.ts                       # SQLite singleton (WAL mode)
│       ├── logger.ts                   # Pino + AsyncLocalStorage
│       ├── utils.ts                    # shadcn utilities
│       └── queries/
│           ├── trading-days.ts         # Trading date queries
│           └── stocks.ts               # Stock data queries
│
├── docs/
│   └── 0.system-architecture.md        # Full architecture spec
│
├── .claude/
│   └── context/
│       └── design-principles.md        # UI guidelines
│
├── .env.local                          # Environment variables
├── CLAUDE.md                           # Project instructions
├── HANDOVER.md                         # This file
└── package.json
```

---

## Environment Variables

```bash
# .env.local
DB_PATH="/Volumes/Data/quant/data/stocks.db"
CONTRACTS_PATH="/Volumes/Data/quant/data/contracts"
PORTFOLIO_ACCOUNT_ID="283445330105777479"
LOG_LEVEL="debug"
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/trading-date` | GET | Latest trading date |
| `/api/stocks` | GET | Stock list (100 by volume) |
| `/api/stocks?q=AAPL` | GET | Search stocks by ticker/name |
| `/api/stocks/[ticker]` | GET | Stock detail + OHLCV history |

---

## Quick Commands

```bash
# Start dev server
pnpm dev

# Test database
sqlite3 /Volumes/Data/quant/data/stocks.db "SELECT date FROM trading_days WHERE day_rank = 1"

# Rebuild native modules (if needed)
npm rebuild better-sqlite3
```

---

## Key Documentation

| Document | Location |
|----------|----------|
| System Architecture | `docs/0.system-architecture.md` |
| Design Principles | `.claude/context/design-principles.md` |
| Project Instructions | `CLAUDE.md` |
| Full Planning Doc | `/Volumes/Data/quant/docs/frontend/FRONTEND_PLAN.md` |
| L3 Contract Schema | `/Volumes/Data/quant/docs/intel/03_l3_stock.md` |

---

## Observability

- **Logging:** Pino with structured JSON, 2-logger pattern (base + request)
- **Request Correlation:** UUID per request via AsyncLocalStorage
- **Response Headers:** X-Request-ID, X-Response-Time
- **OpenTelemetry:** Ready for integration (@vercel/otel installed)

---

## Known Issues / Gotchas

1. **better-sqlite3** requires native rebuild: `npm rebuild better-sqlite3`
2. **Table name:** Use `stocks_metadata` not `stock_base`
3. **Column name:** Use `name` not `company_name` in stocks_metadata
4. **Column name:** Use `macd_line` not `macd` in stocks_technicals
5. **Trading date:** Always use `trading_days` table, never `MAX(date)`

---

**Phase 1 Complete - Ready for Phase 2!**
