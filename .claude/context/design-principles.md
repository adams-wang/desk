# Desk Trading Dashboard - Design Principles

## I. Core Design Philosophy

- [ ] **Clarity Over Decoration:** Financial data must be instantly readable. No ornamental UI.
- [ ] **Speed & Performance:** Sub-second loads. Traders need real-time responsiveness.
- [ ] **Information Density:** Balance data richness with scannability. Show more, scroll less.
- [ ] **Consistency:** Uniform patterns for prices, percentages, dates, and status indicators.
- [ ] **Accessibility (WCAG AA):** Sufficient contrast, keyboard navigation, screen reader support.
- [ ] **Dark Mode First:** Trading dashboards are often used in low-light environments.

## II. Design System Foundation

### Color Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--bg-primary` | `white` | `zinc-950` | Main background |
| `--bg-secondary` | `zinc-50` | `zinc-900` | Cards, panels |
| `--bg-tertiary` | `zinc-100` | `zinc-800` | Hover states |
| `--text-primary` | `zinc-900` | `zinc-50` | Primary text |
| `--text-secondary` | `zinc-500` | `zinc-400` | Labels, captions |
| `--border` | `zinc-200` | `zinc-800` | Dividers, borders |

### Semantic Colors (Financial)

| Token | Color | Usage |
|-------|-------|-------|
| `--positive` | `emerald-500` | Price up, profit, bullish signals |
| `--negative` | `red-500` | Price down, loss, bearish signals |
| `--neutral` | `zinc-400` | Unchanged, no signal |
| `--warning` | `amber-500` | Alerts, approaching thresholds |
| `--info` | `blue-500` | Informational, links |

### Typography

- **Font:** `Inter` or system-ui (clean, tabular numbers support)
- **Scale:** 12px (caption), 14px (body), 16px (subhead), 20px (h3), 24px (h2), 32px (h1)
- **Tabular Numbers:** Always use `font-variant-numeric: tabular-nums` for prices/percentages
- **Monospace:** Use for exact values requiring alignment (order IDs, timestamps)

### Spacing

- **Base unit:** 4px
- **Scale:** 4, 8, 12, 16, 24, 32, 48, 64px
- **Card padding:** 16px (compact) or 24px (spacious)
- **Table row height:** 40-48px

### Border Radius

- **Small:** 4px (buttons, inputs, badges)
- **Medium:** 8px (cards, panels)
- **Large:** 12px (modals, popovers)

## III. Layout & Visual Hierarchy

### Dashboard Structure

```
+------------------+----------------------------------------+
|                  |  Top Bar (optional: search, date)      |
|    Sidebar       +----------------------------------------+
|    (collapsed    |                                        |
|     or fixed)    |           Main Content Area            |
|                  |                                        |
|   - Dashboard    |   +------------+  +------------+       |
|   - Screener     |   |   Card     |  |   Card     |       |
|   - Portfolio    |   +------------+  +------------+       |
|   - Watchlist    |                                        |
|                  |   +-------------------------------+    |
|                  |   |        Chart / Table          |    |
|                  |   +-------------------------------+    |
+------------------+----------------------------------------+
```

### Grid System

- **12-column responsive grid**
- **Breakpoints:** sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- **Primary viewport:** 1440px (optimize for this)

### Visual Hierarchy

1. **Price/Value** - Largest, boldest (the number users care about most)
2. **Change indicator** - Color-coded, immediately visible
3. **Label/Context** - Secondary text, muted color
4. **Metadata** - Smallest, tertiary importance

## IV. Interaction Design

### Loading States

- **Skeleton screens** for initial page load
- **Subtle spinners** for data refresh (don't block UI)
- **Stale data indicator** if data is older than expected

### Animations

- **Duration:** 150-200ms (fast, not sluggish)
- **Easing:** `ease-out` for entrances, `ease-in` for exits
- **Purpose:** Guide attention, confirm actions - never decorative

### Hover & Focus States

- **Tables:** Subtle row highlight on hover
- **Clickable cards:** Slight elevation or border change
- **Focus rings:** Visible, accessible (2px offset, brand color)

## V. Trading-Specific Patterns

### A. Price Display

```tsx
// Always show: current price, change, change %
<span className="text-xl font-semibold tabular-nums">$142.85</span>
<span className="text-positive">+$2.34 (+1.67%)</span>
```

**Rules:**
- [ ] Use `tabular-nums` for all prices (prevents layout shift)
- [ ] Always prefix with currency symbol ($)
- [ ] Show both absolute and percentage change
- [ ] Color the change, not the price itself
- [ ] Use parentheses for negative: `(-2.34%)` not `-2.34%`

### B. Percentage & Ratio Display

| Type | Format | Example |
|------|--------|---------|
| Price change | `+X.XX%` / `(-X.XX%)` | `+1.67%`, `(-2.34%)` |
| MRS/Score | `XX.X%` | `78.5%` |
| Ratio | `X.XX` | `1.45` |
| Basis points | `+XXbps` | `+25bps` |

### C. Number Formatting

| Range | Format | Example |
|-------|--------|---------|
| < 1,000 | Full number | `842` |
| 1K - 999K | X.XXK | `42.5K` |
| 1M - 999M | X.XXM | `1.25M` |
| 1B+ | X.XXB | `2.50B` |

### D. Date & Time

| Context | Format | Example |
|---------|--------|---------|
| Table column | `MMM DD` | `Dec 13` |
| Full date | `YYYY-MM-DD` | `2024-12-13` |
| Timestamp | `HH:mm:ss` | `14:32:05` |
| Relative | `Xm ago` | `5m ago` |

### E. Status Indicators (L3 Verdicts, Signals)

```tsx
// Badge component with semantic colors
<Badge variant="bullish">STRONG BUY</Badge>   // emerald
<Badge variant="bearish">SELL</Badge>          // red
<Badge variant="neutral">HOLD</Badge>          // zinc
<Badge variant="pending">ANALYZING</Badge>     // amber
```

**Verdict Display:**
- [ ] Use uppercase for signal strength
- [ ] Include confidence score when available
- [ ] Show verdict date/freshness

### F. Candlestick Charts (TradingView)

```tsx
// Standard chart configuration
const chartOptions = {
  layout: {
    background: { type: 'solid', color: 'transparent' },
    textColor: 'var(--text-secondary)',
  },
  grid: {
    vertLines: { color: 'var(--border)' },
    horzLines: { color: 'var(--border)' },
  },
  crosshair: { mode: CrosshairMode.Normal },
  timeScale: { borderColor: 'var(--border)' },
};

// Candlestick colors
const candlestickOptions = {
  upColor: 'var(--positive)',
  downColor: 'var(--negative)',
  borderUpColor: 'var(--positive)',
  borderDownColor: 'var(--negative)',
  wickUpColor: 'var(--positive)',
  wickDownColor: 'var(--negative)',
};
```

**Chart Rules:**
- [ ] Minimum height: 400px for primary chart
- [ ] Include volume subplot when relevant
- [ ] Timeframe selector: 1D, 1W, 1M, 3M, 1Y, ALL
- [ ] Crosshair with price/date tooltip
- [ ] Responsive: chart resizes with container

### G. Data Tables (Stock Screener, Portfolio)

```tsx
// Column alignment
<TableHead className="text-left">Ticker</TableHead>     // Text: left
<TableHead className="text-right">Price</TableHead>     // Numbers: right
<TableHead className="text-right">Change</TableHead>    // Numbers: right
<TableHead className="text-center">Signal</TableHead>   // Status: center
```

**Table Rules:**
- [ ] Sticky header on scroll
- [ ] Sortable columns with clear indicator (↑↓)
- [ ] Row hover highlight
- [ ] Click row to navigate to detail
- [ ] Right-align all numeric columns
- [ ] Compact row height (40px) for density
- [ ] Zebra striping optional (prefer clean dividers)

### H. Portfolio Positions

**Required fields:**
- Ticker (link to detail)
- Quantity
- Avg Cost
- Current Price
- Market Value
- Unrealized P&L ($ and %)
- Day Change ($ and %)

**Visual treatment:**
- [ ] P&L prominently colored (positive/negative)
- [ ] Percentage of portfolio as subtle bar or number
- [ ] Group by: All, Gainers, Losers

## VI. Component Patterns

### Cards (Metric Display)

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-sm text-muted-foreground">
      Portfolio Value
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold tabular-nums">$124,532.00</div>
    <p className="text-xs text-positive">+$1,234.56 (+1.0%)</p>
  </CardContent>
</Card>
```

### Empty States

- [ ] Clear message: "No positions" / "No matching stocks"
- [ ] Suggested action if applicable
- [ ] Muted illustration (optional, minimal)

### Error States

- [ ] Red border or background tint
- [ ] Clear error message
- [ ] Retry action when applicable
- [ ] Never show raw error codes to user

## VII. Accessibility Checklist

- [ ] Color is never the only indicator (add icons, text, patterns)
- [ ] All interactive elements keyboard accessible
- [ ] Focus states visible
- [ ] ARIA labels on icon-only buttons
- [ ] Contrast ratio 4.5:1 minimum for text
- [ ] Screen reader announcements for live data updates

## VIII. Performance Guidelines

- [ ] Lazy load charts (below fold)
- [ ] Virtualize long tables (100+ rows)
- [ ] Debounce search/filter inputs (300ms)
- [ ] Cache API responses where appropriate
- [ ] Skeleton loading over spinners for page loads
- [ ] Target: <100ms interaction response, <1s page load
