/**
 * Gap Analysis Indicators
 *
 * TypeScript port of Python lib/gap_indicators.py
 * Calculates gap-related metrics to improve signal quality.
 *
 * Gap Types:
 * ----------
 * 1. Continuation Gaps (1-2% gap + MRS 3-8%): 58-62% win rate - TRADE
 * 2. Exhaustion Gaps (>2% gap + MRS >8%): 42-48% win rate - AVOID
 * 3. Mean Reversion Gaps (<-1% gap + low MRS): 52-55% win rate - SELECTIVE
 * 4. Breakdown Gaps (<-2%): EXIT signal
 */

export interface GapPattern {
  type: "continuation" | "exhaustion" | "mean_reversion" | "breakdown" | null;
  marker: "^" | "X" | "o" | "v" | null;
  color: string;
  label: string;
  action: "TRADE" | "AVOID" | "SELECTIVE" | "EXIT" | null;
}

/**
 * Identify continuation gaps with positive edge.
 * Moderate gap up (1-2%) with moderate MRS (3-8%) = continuation
 * Win rate: 58-62% (favorable)
 */
export function isContinuationGap(
  gapPct: number | null,
  mrs20: number | null,
  gapPercentile: number | null
): boolean {
  if (gapPct === null || mrs20 === null) return false;

  if (gapPct > 1.0 && gapPct <= 2.0 && mrs20 > 3.0 && mrs20 <= 8.0) {
    // Additional filter: unusual gap size increases confidence
    if (gapPercentile !== null && gapPercentile > 70) {
      return true;
    } else if (gapPercentile === null) {
      return true; // Accept without percentile if unavailable
    }
  }
  return false;
}

/**
 * Identify exhaustion gaps that should be avoided.
 * Large gap up (>2%) with extended MRS (>8%) = exhaustion
 * Win rate drops to 42-48% (avoid)
 */
export function isExhaustionGap(
  gapPct: number | null,
  mrs20: number | null,
  volumeRatio: number | null
): boolean {
  if (gapPct === null || mrs20 === null) return false;

  if (gapPct > 2.0 && mrs20 > 8.0) {
    // Additional filter: high volume confirms exhaustion
    if (volumeRatio !== null && volumeRatio > 2.0) {
      return true;
    } else if (volumeRatio === null) {
      return true; // Conservative: flag without volume confirmation
    }
  }
  return false;
}

/**
 * Identify mean reversion gap opportunities.
 * Gap down (-1 to -2%) with low MRS percentile (<10) = mean reversion
 * Win rate: 52-55% (selective)
 */
export function isMeanReversionGap(
  gapPct: number | null,
  mrs20Ts: number | null,
  gapFilled: boolean = false
): boolean {
  if (gapPct === null || mrs20Ts === null) return false;

  if (gapPct > -2.0 && gapPct < -1.0 && mrs20Ts < 10) {
    return true; // Accept with or without fill
  }
  return false;
}

/**
 * Identify breakdown gaps that signal exit.
 * Breakdown gaps (< -2%) typically indicate:
 * - Major support break
 * - Institutional selling
 * - Trend reversal
 */
export function isBreakdownGap(gapPct: number | null): boolean {
  if (gapPct === null) return false;
  return gapPct < -2.0;
}

/**
 * Classify gap pattern for visualization
 * Returns pattern info for chart markers
 */
export function classifyGapPattern(
  gapPct: number | null,
  mrs20: number | null,
  mrs20Ts: number | null,
  gapVolumeRatio: number | null,
  gapPercentile: number | null,
  gapFilled: number | null
): GapPattern {
  if (gapPct === null || mrs20 === null) {
    return { type: null, marker: null, color: "", label: "", action: null };
  }

  // Priority order: breakdown > exhaustion > continuation > mean_reversion
  if (isBreakdownGap(gapPct)) {
    return {
      type: "breakdown",
      marker: "v",
      color: "darkred",
      label: "Breakdown Gap (EXIT)",
      action: "EXIT",
    };
  }

  if (isExhaustionGap(gapPct, mrs20, gapVolumeRatio)) {
    return {
      type: "exhaustion",
      marker: "X",
      color: "red",
      label: "Exhaustion Gap (AVOID)",
      action: "AVOID",
    };
  }

  if (isContinuationGap(gapPct, mrs20, gapPercentile)) {
    return {
      type: "continuation",
      marker: "^",
      color: "green",
      label: "Continuation Gap (TRADE)",
      action: "TRADE",
    };
  }

  if (isMeanReversionGap(gapPct, mrs20Ts, gapFilled === 1)) {
    return {
      type: "mean_reversion",
      marker: "o",
      color: "gold",
      label: "Mean Reversion Gap",
      action: "SELECTIVE",
    };
  }

  return { type: null, marker: null, color: "", label: "", action: null };
}

/**
 * Get L3 verdict display code (e.g., "B|B", "B|H", "S|A")
 */
export function getVerdictCode(
  verdict10: string | null,
  verdict20: string | null
): { code: string; color: string } {
  const codeMap: Record<string, string> = {
    BUY: "B",
    HOLD: "H",
    AVOID: "A",
    SELL: "S",
  };

  const v10 = verdict10 ? codeMap[verdict10] || "?" : "?";
  const v20 = verdict20 ? codeMap[verdict20] || "?" : "?";
  const code = `${v10}|${v20}`;

  // Color based on signal type
  let color: string;
  if (code === "B|B") {
    color = "#166534"; // dark green
  } else if (code === "B|H") {
    color = "#2563eb"; // blue
  } else if (code === "B|A" || code === "S|B" || code === "S|H") {
    color = "#dc2626"; // red
  } else {
    color = "#6b7280"; // gray
  }

  return { code, color };
}

/**
 * Get volume bar color based on percentile and price direction
 * Matches Python logic exactly
 */
export function getVolumeBarColor(
  percentile: number | null,
  isUp: boolean
): { color: string; alpha: number } {
  const pct = percentile ?? 50;

  if (pct >= 75) {
    // High volume: dark green/red
    return {
      color: isUp ? "#166534" : "#991b1b",
      alpha: 0.7,
    };
  } else if (pct >= 25) {
    // Normal volume: regular green/red
    return {
      color: isUp ? "#22c55e" : "#ef4444",
      alpha: 0.4,
    };
  } else {
    // Low volume: gray
    return {
      color: "#696969",
      alpha: 0.6,
    };
  }
}

/**
 * Get volume regime classification
 */
export function getVolumeRegime(
  percentile: number | null
): { regime: string; color: string } {
  if (percentile === null) {
    return { regime: "N/A", color: "#6b7280" };
  }

  if (percentile < 25) {
    return { regime: "LOW", color: "#6b7280" };
  } else if (percentile < 75) {
    return { regime: "NORMAL", color: "#2563eb" };
  } else if (percentile < 90) {
    return { regime: "HIGH", color: "#f97316" };
  } else {
    return { regime: "EXTREME", color: "#dc2626" };
  }
}

/**
 * Check for price divergence (intraday vs daily direction mismatch)
 * Highest priority label in Python implementation
 */
export function checkDivergence(
  open: number,
  close: number,
  prevClose: number | null
): { hasDivergence: boolean; label: string; isRally: boolean } {
  if (prevClose === null) {
    return { hasDivergence: false, label: "", isRally: false };
  }

  const intradayUp = close > open;
  const dailyUp = close > prevClose;

  if (intradayUp !== dailyUp) {
    return {
      hasDivergence: true,
      label: intradayUp ? "Div.Rally" : "Div.Decline",
      isRally: intradayUp,
    };
  }

  return { hasDivergence: false, label: "", isRally: false };
}

/**
 * Get pattern label with confirmation status
 * For key reversal patterns: HAMMER, SHOOTING_STAR, HANGING_MAN, INV_HAMMER, LONG_SHADOW
 */
export function getPatternLabel(
  pattern: string | null,
  reversalConfirmed: string | null
): { label: string; bgColor: string; textColor: string } | null {
  if (!pattern) return null;

  const keyPatterns: Record<
    string,
    { emoji: string; name: string }
  > = {
    HAMMER: { emoji: "🔨", name: "Hammer" },
    SHOOTING_STAR: { emoji: "💫", name: "Shooting" },
    HANGING_MAN: { emoji: "⚠️", name: "Hanging" },
    INV_HAMMER: { emoji: "🔄", name: "InvHammer" },
    LONG_SHADOW: { emoji: "│", name: "Shadow" },
  };

  const patternInfo = keyPatterns[pattern];
  if (!patternInfo) return null;

  if (reversalConfirmed === "BULLISH_CONFIRMED") {
    return {
      label: `✅${patternInfo.emoji}CONFIRMED`,
      bgColor: "#166534", // dark green
      textColor: "white",
    };
  } else if (reversalConfirmed === "BEARISH_CONFIRMED") {
    return {
      label: `✅${patternInfo.emoji}CONFIRMED`,
      bgColor: "#991b1b", // dark red
      textColor: "white",
    };
  } else {
    return {
      label: `⚠️${patternInfo.emoji}${patternInfo.name}`,
      bgColor: "#d1d5db", // light gray
      textColor: "#374151", // dark gray
    };
  }
}

/**
 * Volume acceleration calculation (smart money detection)
 * Returns ratio of current volume vs previous 3-day average
 */
export function calculateVolumeAcceleration(
  volumes: number[],
  currentIndex: number
): number | null {
  if (currentIndex < 3) return null;

  const prev3 = volumes.slice(currentIndex - 3, currentIndex);
  const avg = prev3.reduce((a, b) => a + b, 0) / 3;

  if (avg <= 0) return null;
  return volumes[currentIndex] / avg;
}

// Volume climax threshold from Python config
export const VOLUME_CLIMAX_THRESHOLD = 1.5;
