/**
 * Shared formatting utilities for displaying numbers, percentages, and volumes
 */

/**
 * Format a number with specified decimal places
 */
export function formatNumber(value: number | null, decimals: number = 2): string {
  if (value === null || value === undefined) return "-";
  return value.toFixed(decimals);
}

/**
 * Format a decimal as a percentage with sign
 * @param value - Decimal value (e.g., 0.05 for 5%)
 */
export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "-";
  const pct = value * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

/**
 * Format large numbers with K/M/B suffix
 */
export function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

/**
 * Format price with dollar sign
 */
export function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return `$${value.toFixed(2)}`;
}

/**
 * Format change with sign and color class
 */
export function formatChange(value: number | null): { text: string; isPositive: boolean } {
  if (value === null || value === undefined) return { text: "-", isPositive: true };
  const sign = value >= 0 ? "+" : "";
  return {
    text: `${sign}${value.toFixed(2)}`,
    isPositive: value >= 0,
  };
}
