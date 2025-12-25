# Desk - US Equity Trading

## Project Identity

Next.js frontend for US equity quant trading visualization. **Read-only** consumer of data from `/Volumes/Data/quant/`.

## Critical Rules

1. **Quant database access:**
   - Dashboard views: **read-only**
   - Position management: **write allowed** (future feature)
2. **Use `trading_days` table** for latest date - never `MAX(date)` from other tables
3. **Portfolio account ID:** `283445330105777479` - hardcode in env
4. **L3 contracts path:** `/Volumes/Data/quant/data/contracts/{date}/l3_10_{ticker}.json`

## Tech Decisions (Already Made)

| Choice                  | Reason                            |
| ----------------------- | --------------------------------- |
| Next.js 16.0.10         | Turbopack, Cache Components, PPR  |
| React 19.2.1            | Activity API, useEffectEvent      |
| better-sqlite3          | Direct DB read, no API layer      |
| Recharts                | shadcn charts integration         |

## Database Location

```
DB_PATH=/Volumes/Data/quant/data/stocks.db
```

## Key Tables

```sql
-- Latest trading date (ALWAYS use this)
SELECT date FROM trading_days WHERE day_rank = 1

-- Stock data join
stocks_ohlcv + stocks_indicators + stocks_technicals + candle_descriptors

-- L3 verdicts
l3_contracts_10, l3_contracts_20

-- Portfolio
portfolio_positions WHERE acc_id = '283445330105777479'
```

## Implementation Status

Check `HANDOVER.md` for phase checklist.

## Reference Docs

- Full spec: `/Volumes/Data/quant/docs/frontend/FRONTEND_PLAN.md`
- Stock summary reference: `/Volumes/Data/quant/cli/dashboards/stock_summary.py`
- L3 schema: `/Volumes/Data/quant/docs/intel/03_l3_stock.md`

## Common Patterns

### API Route

```typescript
// src/app/api/stocks/[ticker]/route.ts
import { getStockDetail } from "@/lib/queries/stocks";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  const data = getStockDetail(params.ticker);
  return NextResponse.json(data);
}
```

### Client Component with Chart

```typescript
"use client";
import { createChart } from "lightweight-charts";
import { useEffect, useRef } from "react";

export function PriceChart({ data }: { data: OHLCV[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      /* options */
    });
    const series = chart.addCandlestickSeries();
    series.setData(data);
    return () => chart.remove();
  }, [data]);

  return <div ref={containerRef} className="h-[400px]" />;
}
```

## Gotchas

1. **better-sqlite3 is sync** - use in API routes only, not client
2. **TradingView charts need client component** - 'use client' directive
3. **Date format in DB is YYYY-MM-DD** - parse with date-fns if needed
4. **MRS values are percentages** - multiply by 100 for display

## Visual Development

### Design Verification (Required for Frontend Changes)

IMMEDIATELY after implementing any front-end change:

1. **Identify what changed** - Review modified components/pages
2. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate`
3. **Verify design compliance** - Compare against `.claude/context/design-principles.md`
4. **Validate feature implementation** - Ensure change fulfills user request
5. **Check acceptance criteria** - Review provided context files
6. **Capture evidence** - Take full page screenshot at 1440px viewport
7. **Check for errors** - Run `mcp__playwright__browser_console_messages`

### Comprehensive Design Review

Invoke `@agent-ui-review` subagent for thorough validation when:

- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility/responsiveness testing

## Documentation

- **Design principles**: `.claude/context/design-principles.md`
- **Architecture**: `docs/design/ARCHITECTURE.md`

## Quick Commands

```bash
# Dev server
pnpm dev

# Test DB connection
sqlite3 /Volumes/Data/quant/data/stocks.db "SELECT date FROM trading_days WHERE day_rank = 1"

# Check L3 contracts exist
ls /Volumes/Data/quant/data/contracts/$(date +%Y-%m-%d)/
```
