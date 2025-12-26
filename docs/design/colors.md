# Color System

## Overview

Desk uses **OKLch color space** for perceptually uniform colors across light and dark modes. This ensures consistent perceived brightness regardless of hue.

---

## Base Theme Colors

### Light Mode

```css
--background: oklch(1 0 0);           /* Pure white */
--foreground: oklch(0.145 0 0);       /* Near black */
--primary: oklch(0.205 0 0);          /* Dark gray */
--muted: oklch(0.97 0 0);             /* Very light gray */
--muted-foreground: oklch(0.556 0 0); /* Medium gray */
--border: oklch(0.922 0 0);           /* Light border */
```

### Dark Mode

```css
--background: oklch(0.145 0 0);       /* Near black */
--foreground: oklch(0.985 0 0);       /* Near white */
--primary: oklch(0.922 0 0);          /* Light gray */
--muted: oklch(0.269 0 0);            /* Dark gray */
--muted-foreground: oklch(0.708 0 0); /* Medium gray */
--border: oklch(0.269 0 0);           /* Dark border */
```

---

## Semantic Colors

### Trading Signals

| Purpose | Hex | OKLch | Usage |
|---------|-----|-------|-------|
| **Bullish/Buy** | `#22c55e` | `oklch(0.723 0.191 142.5)` | Buy verdicts, up volume, positive change |
| **Bearish/Avoid** | `#ef4444` | `oklch(0.577 0.245 27.3)` | Avoid verdicts, down volume, negative change |
| **Neutral/Hold** | `#9ca3af` | `oklch(0.707 0.015 261.3)` | Hold verdicts, neutral indicators |
| **Info/Highlight** | `#3b82f6` | `oklch(0.623 0.214 259.1)` | Price line, mixed signals (B|H) |

### Volume Percentile Colors

| Percentile | Up Day | Down Day | Opacity |
|------------|--------|----------|---------|
| ≥75% (High) | `#22c55e` | `#ef4444` | 100% |
| 25-75% (Normal) | `#22c55e` | `#ef4444` | 60% |
| <25% (Low) | `#22c55e` | `#ef4444` | 30% |

```typescript
const getVolumeBarColor = (percentile: number, isUp: boolean) => {
  const baseColor = isUp ? "#22c55e" : "#ef4444";
  const alpha = percentile >= 75 ? 1 : percentile >= 25 ? 0.6 : 0.3;
  return { color: baseColor, alpha };
};
```

### VIX Regime Colors

| Regime | Color | Meaning |
|--------|-------|---------|
| `risk_on` | Green | Low volatility, bullish |
| `normal` | Blue | Normal volatility |
| `risk_off` | Amber | Elevated volatility |
| `crisis` | Red | High volatility, bearish |

### Gap Indicator Colors

| Type | Arrow Color | Badge |
|------|-------------|-------|
| Gap Up | Green `#22c55e` | — |
| Gap Down | Red `#ef4444` | — |
| PREFER | — | Green background |
| AVOID | — | Red background |

### Financial Semantic Variables

Added to `globals.css` for consistent financial UI:

```css
:root {
  --positive: oklch(0.696 0.17 162.48);   /* emerald-500 - bullish */
  --negative: oklch(0.637 0.237 25.331);  /* red-500 - bearish */
  --warning: oklch(0.769 0.188 70.08);    /* amber-500 - alerts */
  --neutral: oklch(0.552 0 0);            /* zinc-500 - unchanged */
  --info: oklch(0.623 0.214 259.815);     /* blue-500 - informational */
}
```

---

## Chart Variables

CSS variables for Recharts and data visualization:

```css
/* Light mode */
--chart-1: oklch(0.646 0.222 41.116);   /* Orange-red */
--chart-2: oklch(0.6 0.118 184.704);    /* Teal */
--chart-3: oklch(0.398 0.07 227.392);   /* Dark blue */
--chart-4: oklch(0.828 0.189 84.429);   /* Yellow */
--chart-5: oklch(0.769 0.188 70.08);    /* Amber */

/* Dark mode */
--chart-1: oklch(0.488 0.243 264.376);  /* Blue-violet */
--chart-2: oklch(0.696 0.17 162.48);    /* Emerald */
--chart-3: oklch(0.769 0.188 70.08);    /* Amber */
--chart-4: oklch(0.627 0.265 303.9);    /* Purple */
--chart-5: oklch(0.645 0.246 16.439);   /* Red-orange */
```

---

## Sidebar Variables

```css
--sidebar: oklch(0.985 0 0);            /* Light: near-white */
--sidebar-foreground: oklch(0.145 0 0);
--sidebar-primary: oklch(0.205 0 0);
--sidebar-accent: oklch(0.97 0 0);
--sidebar-border: oklch(0.922 0 0);

/* Dark mode */
--sidebar: oklch(0.205 0 0);            /* Dark gray */
--sidebar-foreground: oklch(0.985 0 0);
--sidebar-primary: oklch(0.488 0.243 264.376);
--sidebar-accent: oklch(0.269 0 0);
--sidebar-border: oklch(1 0 0 / 10%);
```

---

## Chart-Specific Colors

### Price Lines

| Line | Color | Stroke |
|------|-------|--------|
| Close price | `#3b82f6` (blue) | 2px solid |
| SMA 20 | `#f59e0b` (amber) | 1px solid |
| SMA 50 | `#8b5cf6` (purple) | 1px solid |
| SMA 200 | `#ef4444` (red) | 1px solid |
| Volume MA | `#f97316` (orange) | 1px dashed |

### Candlestick Colors

| State | Body | Wick |
|-------|------|------|
| Up (Close > Open) | `#22c55e` | `#22c55e` |
| Down (Close < Open) | `#ef4444` | `#ef4444` |
| Doji | Gray stroke | Gray |

---

## Accessibility

### Contrast Ratios

All text colors meet WCAG 2.1 AA standards:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum

### Color Blindness

- Red/Green differentiation supplemented with:
  - Opacity differences (volume bars)
  - Shape differences (up arrow vs down arrow)
  - Position (above vs below price line)

---

## Implementation

### Tailwind Classes

```tsx
// Bullish
className="text-emerald-500"  // #22c55e equivalent
className="bg-emerald-500/20" // 20% opacity background

// Bearish
className="text-red-500"      // #ef4444 equivalent
className="bg-red-500/20"

// Neutral
className="text-gray-400"     // #9ca3af equivalent
className="text-muted-foreground"
```

### Direct SVG (Charts)

```tsx
// In Recharts custom renderers
fill={isUp ? "#22c55e" : "#ef4444"}
stroke="#3b82f6"
```

### CSS Variables

```tsx
// Using CSS custom properties
style={{ color: "var(--color-foreground)" }}
className="bg-background text-foreground"
```
