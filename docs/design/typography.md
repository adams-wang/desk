# Typography System

## Font Stack

**Primary Font:** Inter (Google Fonts)

```typescript
// src/app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
```

Inter provides excellent tabular number support and readability for financial data. Loaded via `next/font` for automatic optimization.

---

## Scale

### Base Scale (Tailwind)

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 16px | Captions, timestamps |
| `text-sm` | 14px | 20px | Secondary text, labels |
| `text-base` | 16px | 24px | Body text (default) |
| `text-lg` | 18px | 28px | Subheadings |
| `text-xl` | 20px | 28px | Card titles |
| `text-2xl` | 24px | 32px | Page titles |
| `text-3xl` | 30px | 36px | Hero text |

---

## Chart Typography

### Verdict Badges

| View | Font Size | Weight | Format | Rationale |
|------|-----------|--------|--------|-----------|
| 1M (20 days) | 10px | Bold | `A\|B` | Full readability, no crowding |
| 2M (40 days) | 10px | Bold | `A\|B` | Still enough space |
| 3M (60 days) | 9px | Bold | `AB` | Prevent overlap, remove pipe saves ~30% width |

```typescript
const is3M = currentRange > 40;
const fontSize = is3M ? 9 : 10;
const showPipe = !is3M;
```

### Axis Labels

| Axis | Font Size | Weight | Style |
|------|-----------|--------|-------|
| Date labels (normal) | 10px | Normal | Horizontal |
| Date labels (compact) | 10px | Normal | Rotated -90° |
| OFD codes | 9px | Bold | Amber color |
| Price axis | 12px | Normal | Right-aligned |
| Volume axis | 12px | Normal | Right-aligned |

### Tooltips

| Element | Font Size | Weight |
|---------|-----------|--------|
| Header (date) | 12px | Semibold |
| Values | 11px | Normal |
| Labels | 11px | Normal, muted |

### Annotations

| Type | Font Size | Weight | Color |
|------|-----------|--------|-------|
| Volume percentile | 9px | Bold | Matches bar color |
| Acceleration ratio | 9px | Normal | Orange |
| Gap badges | 10px | Bold | Signal color |
| Pattern labels | 9px | Normal | Gray |

---

## UI Typography

### Headers

| Level | Class | Size | Weight | Usage |
|-------|-------|------|--------|-------|
| H1 | `text-2xl font-bold` | 24px | Bold | Page titles |
| H2 | `text-xl font-semibold` | 20px | Semibold | Section titles |
| H3 | `text-lg font-medium` | 18px | Medium | Card headers |

### Body

| Type | Class | Size | Usage |
|------|-------|------|-------|
| Primary | `text-base` | 16px | Main content |
| Secondary | `text-sm text-muted-foreground` | 14px | Supporting text |
| Caption | `text-xs text-muted-foreground` | 12px | Timestamps, metadata |

### Data Display

| Type | Class | Size | Weight |
|------|-------|------|--------|
| Price | `text-2xl font-bold` | 24px | Bold |
| Change % | `text-lg font-semibold` | 18px | Semibold |
| Label | `text-sm` | 14px | Normal |
| Value | `text-sm font-medium` | 14px | Medium |

---

## Numeric Formatting

### Prices

```typescript
// Always 2 decimal places
$176.29
$1,234.56
```

### Percentages

```typescript
// Change percentages with sign
+1.27%
-0.73%

// Percentile (no sign)
75%ile
30%ile
```

### Ratios

```typescript
// Volume ratio
1.5x
0.97x
```

### Large Numbers

```typescript
// Volume (abbreviated)
150M
1.2B

// Full numbers (position sizes)
$13,927
101 shares
```

---

## Responsive Typography

### Mobile (< 768px)

- Reduce heading sizes by one step
- Use `text-sm` for most body text
- Stack labels vertically

### Desktop (≥ 768px)

- Full typography scale
- Horizontal label layouts
- Larger chart annotations

---

## Implementation Patterns

### Tailwind Classes

```tsx
// Page title
<h1 className="text-2xl font-bold tracking-tight">
  Stock Detail
</h1>

// Card header
<h2 className="text-lg font-semibold">
  Trade Setup
</h2>

// Data label + value
<div className="flex justify-between">
  <span className="text-sm text-muted-foreground">Entry</span>
  <span className="text-sm font-medium">$176.29</span>
</div>

// Price display
<span className="text-2xl font-bold tabular-nums">
  $176.29
</span>

// Change with color
<span className={cn(
  "text-lg font-semibold",
  change >= 0 ? "text-emerald-500" : "text-red-500"
)}>
  {change >= 0 ? "+" : ""}{change}%
</span>
```

### SVG Text (Charts)

```tsx
// Verdict badge
<text
  fontSize={is3M ? 9 : 10}
  fontWeight="bold"
  textAnchor="middle"
>
  <tspan fill={getLetterColor(letter1)}>{letter1}</tspan>
  {showPipe && <tspan fill="#6b7280">|</tspan>}
  <tspan fill={getLetterColor(letter2)}>{letter2}</tspan>
</text>

// Axis label
<text
  fontSize={10}
  fill="var(--color-muted-foreground)"
  textAnchor="middle"
>
  12-15
</text>
```

---

## Tabular Numbers

For data-heavy displays, use `tabular-nums` to ensure numeric alignment:

```tsx
<span className="tabular-nums">$1,234.56</span>
<span className="tabular-nums">+12.34%</span>
```

This prevents layout shifts when numbers change.
