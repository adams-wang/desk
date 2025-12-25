#!/usr/bin/env python3
"""
MRS Lifecycle Backtest with Specific Thresholds

User's suggested thresholds:
- MRS10 "buy zone": 3 to 6
- MRS20 "buy zone": 4 to 8.5
"""

import sqlite3
import pandas as pd
import numpy as np

DB_PATH = "/Volumes/Data/quant/data/stocks.db"

def get_phase_v2(mrs10: float, mrs20: float) -> str:
    """
    Lifecycle phases with specific thresholds:

    MRS10 states:
      - STRONG: 3 <= mrs10 <= 6 (optimal buy zone)
      - POSITIVE: mrs10 > 0 (but not in sweet spot)
      - NEGATIVE: mrs10 <= 0

    MRS20 states:
      - STRONG: 4 <= mrs20 <= 8.5 (optimal buy zone)
      - POSITIVE: mrs20 > 0 (but not in sweet spot)
      - NEGATIVE: mrs20 <= 0
    """
    if mrs10 is None or mrs20 is None:
        return "UNKNOWN"

    mrs10_strong = 3 <= mrs10 <= 6
    mrs10_pos = mrs10 > 0
    mrs20_strong = 4 <= mrs20 <= 8.5
    mrs20_pos = mrs20 > 0

    # Best signal: both in sweet spot
    if mrs10_strong and mrs20_strong:
        return "DUAL_STRONG"

    # MRS10 in sweet spot, MRS20 positive but not sweet spot
    if mrs10_strong and mrs20_pos:
        return "MRS10_STRONG"

    # MRS20 in sweet spot, MRS10 positive but not sweet spot
    if mrs20_strong and mrs10_pos:
        return "MRS20_STRONG"

    # Both positive but neither in sweet spot
    if mrs10_pos and mrs20_pos:
        return "DUAL_POS"

    # MRS10 entering (positive, maybe entering sweet spot soon)
    if mrs10_pos and not mrs20_pos:
        return "EARLY_ENTRY"

    # MRS20 lagging (MRS10 turned negative, MRS20 still positive)
    if not mrs10_pos and mrs20_pos:
        return "LATE_EXIT"

    # Both negative
    return "BEAR"

def load_data(start_date: str = "2024-01-01", end_date: str = "2025-12-16") -> pd.DataFrame:
    conn = sqlite3.connect(DB_PATH)
    query = """
    SELECT
        o.ticker, o.date, o.open, o.high, o.low, o.close, o.volume,
        i.mrs_10, i.mrs_20,
        t.atr_14,
        l10.verdict as l3_verdict
    FROM stocks_ohlcv o
    JOIN stocks_indicators i ON o.ticker = i.ticker AND o.date = i.date
    JOIN stocks_technicals t ON o.ticker = t.ticker AND o.date = t.date
    LEFT JOIN l3_contracts_10 l10 ON o.ticker = l10.ticker AND o.date = l10.trading_date
    WHERE o.date >= ? AND o.date <= ?
        AND i.mrs_10 IS NOT NULL AND i.mrs_20 IS NOT NULL
        AND t.atr_14 IS NOT NULL
        AND o.volume > 100000
    ORDER BY o.ticker, o.date
    """
    df = pd.read_sql_query(query, conn, params=(start_date, end_date))
    conn.close()
    return df

def analyze_forward_returns(df: pd.DataFrame, hold_days: int = 5):
    """Analyze forward returns by phase."""

    # Calculate forward returns
    df = df.copy()
    df['fwd_close'] = df.groupby('ticker')['close'].shift(-hold_days)
    df['fwd_return'] = (df['fwd_close'] - df['close']) / df['close'] * 100

    # Calculate phase
    df['phase'] = df.apply(lambda r: get_phase_v2(r['mrs_10'], r['mrs_20']), axis=1)

    print(f"\nPhase Distribution:")
    print("-" * 60)
    phase_counts = df['phase'].value_counts()
    for phase, count in phase_counts.items():
        print(f"  {phase:<15}: {count:>8,} ({count/len(df)*100:>5.1f}%)")

    print(f"\n{hold_days}-Day Forward Returns by Phase:")
    print("-" * 70)
    print(f"{'Phase':<15} {'Count':>8} {'Win%':>8} {'AvgRet':>10} {'MedianRet':>10}")
    print("-" * 70)

    results = []
    for phase in ['DUAL_STRONG', 'MRS10_STRONG', 'MRS20_STRONG', 'DUAL_POS', 'EARLY_ENTRY', 'LATE_EXIT', 'BEAR']:
        phase_df = df[df['phase'] == phase]
        fwd = phase_df['fwd_return'].dropna()

        if len(fwd) < 50:
            continue

        win_rate = (fwd > 0).mean() * 100
        avg_ret = fwd.mean()
        median_ret = fwd.median()

        print(f"{phase:<15} {len(fwd):>8,} {win_rate:>7.1f}% {avg_ret:>+9.2f}% {median_ret:>+9.2f}%")

        results.append({
            'phase': phase,
            'count': len(fwd),
            'win_rate': win_rate,
            'avg_return': avg_ret,
            'median_return': median_ret,
        })

    return df, results

def analyze_with_l3(df: pd.DataFrame, hold_days: int = 5):
    """Analyze with L3 alignment."""

    df = df.copy()
    df['fwd_close'] = df.groupby('ticker')['close'].shift(-hold_days)
    df['fwd_return'] = (df['fwd_close'] - df['close']) / df['close'] * 100
    df['phase'] = df.apply(lambda r: get_phase_v2(r['mrs_10'], r['mrs_20']), axis=1)

    print(f"\n{hold_days}-Day Forward Returns: Phase + L3 Alignment")
    print("-" * 80)
    print(f"{'Phase + L3':<25} {'Count':>8} {'Win%':>8} {'AvgRet':>10} {'MedianRet':>10}")
    print("-" * 80)

    for phase in ['DUAL_STRONG', 'MRS10_STRONG', 'MRS20_STRONG', 'DUAL_POS', 'EARLY_ENTRY']:
        for verdict in ['BUY', 'HOLD', None]:
            if verdict is None:
                subset = df[(df['phase'] == phase) & (df['l3_verdict'].isna())]
                label = f"{phase} + NO_L3"
            else:
                subset = df[(df['phase'] == phase) & (df['l3_verdict'] == verdict)]
                label = f"{phase} + {verdict}"

            fwd = subset['fwd_return'].dropna()
            if len(fwd) < 30:
                continue

            win_rate = (fwd > 0).mean() * 100
            avg_ret = fwd.mean()
            median_ret = fwd.median()

            print(f"{label:<25} {len(fwd):>8,} {win_rate:>7.1f}% {avg_ret:>+9.2f}% {median_ret:>+9.2f}%")

def run_transition_backtest(df: pd.DataFrame, entry_phases: list, hold_days: int = 5, atr_mult: float = 2.0):
    """Run backtest on phase transitions."""

    df = df.copy()
    df['phase'] = df.apply(lambda r: get_phase_v2(r['mrs_10'], r['mrs_20']), axis=1)
    df['prev_phase'] = df.groupby('ticker')['phase'].shift(1)
    df['phase_changed'] = df['phase'] != df['prev_phase']

    trades = []

    for ticker, ticker_df in df.groupby('ticker'):
        ticker_df = ticker_df.reset_index(drop=True)

        i = 0
        while i < len(ticker_df) - hold_days:
            row = ticker_df.iloc[i]

            if row['phase'] in entry_phases and row['phase_changed'] and pd.notna(row['prev_phase']):
                entry_price = row['close']
                entry_atr = row['atr_14']
                stop_loss = entry_price - (atr_mult * entry_atr)

                exit_price = None
                exit_reason = None

                for j in range(1, hold_days + 1):
                    if i + j >= len(ticker_df):
                        break

                    future_row = ticker_df.iloc[i + j]

                    if future_row['low'] <= stop_loss:
                        exit_price = stop_loss
                        exit_reason = "STOP"
                        break

                    if j == hold_days:
                        exit_price = future_row['close']
                        exit_reason = "TIME"

                if exit_price:
                    pnl = (exit_price - entry_price) / entry_price * 100
                    trades.append({
                        'ticker': ticker,
                        'entry_date': row['date'],
                        'entry_phase': row['phase'],
                        'pnl_pct': pnl,
                        'exit_reason': exit_reason,
                    })
                    i += hold_days
                    continue

            i += 1

    return pd.DataFrame(trades)

def main():
    print("=" * 70)
    print("MRS Lifecycle Backtest with Threshold Zones")
    print("=" * 70)
    print("\nThreshold Definitions:")
    print("  MRS10 'strong': 3 <= mrs10 <= 6")
    print("  MRS20 'strong': 4 <= mrs20 <= 8.5")
    print()

    df = load_data("2024-01-01", "2025-12-16")
    print(f"Loaded {len(df):,} rows for {df['ticker'].nunique()} tickers")

    # Forward return analysis
    for hold_days in [5, 10]:
        df_analyzed, results = analyze_forward_returns(df.copy(), hold_days)

    # L3 alignment analysis
    analyze_with_l3(df.copy(), hold_days=5)

    # Transition backtest
    print("\n" + "=" * 70)
    print("Transition Backtest (enter on phase change, 5d hold, 2x ATR stop)")
    print("-" * 70)

    for phases in [
        ["DUAL_STRONG"],
        ["MRS10_STRONG", "MRS20_STRONG"],
        ["DUAL_STRONG", "MRS10_STRONG", "MRS20_STRONG"],
        ["DUAL_POS"],
    ]:
        trades = run_transition_backtest(df.copy(), phases, hold_days=5, atr_mult=2.0)

        if len(trades) < 10:
            print(f"  {'+'.join(phases)}: Too few trades ({len(trades)})")
            continue

        winners = trades[trades['pnl_pct'] > 0]
        win_rate = len(winners) / len(trades) * 100
        avg_ret = trades['pnl_pct'].mean()

        print(f"  {'+'.join(phases):<35}: Trades={len(trades):>5}, WR={win_rate:.1f}%, AvgRet={avg_ret:+.2f}%")

    # Compare old vs new thresholds
    print("\n" + "=" * 70)
    print("Comparison: Simple >0 vs Threshold Zones")
    print("-" * 70)

    df = df.copy()
    df['fwd_close'] = df.groupby('ticker')['close'].shift(-5)
    df['fwd_return'] = (df['fwd_close'] - df['close']) / df['close'] * 100

    # Old method: both > 0
    old_confirmed = df[(df['mrs_10'] > 0) & (df['mrs_20'] > 0)]
    old_fwd = old_confirmed['fwd_return'].dropna()
    print(f"  OLD (mrs10>0 & mrs20>0):      n={len(old_fwd):>6,}, WR={(old_fwd>0).mean()*100:.1f}%, Avg={old_fwd.mean():+.2f}%")

    # New method: both in sweet spot
    new_confirmed = df[(df['mrs_10'] >= 3) & (df['mrs_10'] <= 6) & (df['mrs_20'] >= 4) & (df['mrs_20'] <= 8.5)]
    new_fwd = new_confirmed['fwd_return'].dropna()
    print(f"  NEW (mrs10:3-6 & mrs20:4-8.5): n={len(new_fwd):>6,}, WR={(new_fwd>0).mean()*100:.1f}%, Avg={new_fwd.mean():+.2f}%")

    # Just MRS10 in sweet spot
    mrs10_only = df[(df['mrs_10'] >= 3) & (df['mrs_10'] <= 6)]
    mrs10_fwd = mrs10_only['fwd_return'].dropna()
    print(f"  MRS10 only (3-6):              n={len(mrs10_fwd):>6,}, WR={(mrs10_fwd>0).mean()*100:.1f}%, Avg={mrs10_fwd.mean():+.2f}%")

    # Just MRS20 in sweet spot
    mrs20_only = df[(df['mrs_20'] >= 4) & (df['mrs_20'] <= 8.5)]
    mrs20_fwd = mrs20_only['fwd_return'].dropna()
    print(f"  MRS20 only (4-8.5):            n={len(mrs20_fwd):>6,}, WR={(mrs20_fwd>0).mean()*100:.1f}%, Avg={mrs20_fwd.mean():+.2f}%")

if __name__ == "__main__":
    main()
