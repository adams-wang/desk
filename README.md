# Desk - US Equity Trading Dashboard

Next.js frontend for US equity quant trading visualization.

## Features

- **Market Overview** - VIX regime, market breadth, sector rotation analysis
- **Stock Screener** - Filter by edge signals, verdicts, sectors with sortable columns
- **Stock Detail** - Price/volume charts, L3 contract reports, technical indicators
- **Sector Analysis** - L2 rotation map, sector rankings, MRS trajectories
- **AI Advisor** - Claude-powered trading assistant with multi-day context

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16.0.10 | Framework with Turbopack |
| React 19.2.1 | UI with React Compiler |
| better-sqlite3 | Direct SQLite read access |
| Recharts | Charts and visualizations |
| shadcn/ui | Component library |
| Tailwind CSS 4 | Styling with OKLCH colors |

## Getting Started

```bash
# Install dependencies
pnpm install

# Rebuild native modules
pnpm rebuild better-sqlite3

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Market Overview (home)
│   ├── stocks/            # Stock screener & detail
│   ├── sectors/           # Sector analysis
│   ├── chat/              # AI Advisor
│   └── api/               # API routes
├── components/
│   ├── charts/            # Recharts visualizations
│   ├── market/            # Market overview components
│   ├── sectors/           # Sector analysis components
│   └── ui/                # shadcn components
└── lib/
    ├── db.ts              # SQLite connection
    ├── queries/           # Database queries
    └── formatters.ts      # Number formatting
```

## Data Source

Reads from `/Volumes/Data/quant/data/stocks.db` (read-only).

## Documentation

- `CLAUDE.md` - Project instructions for Claude Code
- `.claude/context/design-principles.md` - UI/UX guidelines
