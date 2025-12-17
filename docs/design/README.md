# Desk Design Documentation

## Overview

Design specifications for the Desk Trading Dashboard - a Next.js 16 frontend for US equity quant trading visualization.

---

## Quick Links

### Architecture

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture, technology decisions, data flow

### Foundations

- **[Colors](./foundations/colors.md)** - Color system, semantic colors, chart palettes
- **[Typography](./foundations/typography.md)** - Font scale, chart text, numeric formatting

### Pages

- **[Stock Detail](./pages/stock-detail.md)** - `/stocks/[ticker]` page layout and components

### Components

- **[PriceVolumeChart](./components/price-volume-chart.md)** - Main chart component (1500+ lines)

---

## Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| ARCHITECTURE.md | Complete | 2025-12-17 |
| foundations/colors.md | Complete | 2025-12-17 |
| foundations/typography.md | Complete | 2025-12-17 |
| pages/stock-detail.md | Complete | 2025-12-17 |
| components/price-volume-chart.md | Complete | 2025-12-17 |
| pages/dashboard.md | Planned | — |
| pages/sectors.md | Planned | — |
| components/report-sheet.md | Planned | — |
| components/sector-rotation-chart.md | Planned | — |
| foundations/spacing.md | Planned | — |

---

## Design Principles

### 1. Information Density

Trading dashboards require **maximum information per pixel**. Every element should convey actionable data.

### 2. Glanceability

Key signals (verdicts, volume spikes, gaps) must be **instantly recognizable** through color, size, and position.

### 3. Consistency

Same data = same visual treatment across all views. Green always means bullish, red always means bearish.

### 4. Progressive Disclosure

Show summary first, details on demand. Verdict badges → click → full report sheet.

### 5. Performance

No loading spinners for primary content. Server-fetch everything, render once.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 16 | SSR, routing, API |
| UI | React 19 | Component model |
| Styling | Tailwind v4 | Utility-first CSS |
| Charts | Recharts | Data visualization |
| Components | shadcn/ui | Accessible primitives |
| Database | better-sqlite3 | Read-only data access |

---

## Contributing

When adding new documentation:

1. Use the appropriate directory (`pages/`, `components/`, `foundations/`)
2. Follow the existing format (Overview → Details → Examples)
3. Include code examples where applicable
4. Update this README's document status table
5. Cross-reference related documents
