#!/usr/bin/env python3
"""
Test L3 verdict alignment with MRS lifecycle
"""

import sqlite3
import pandas as pd
import numpy as np

DB_PATH = "/Volumes/Data/quant/data/stocks.db"

def get_lifecycle_phase(mrs10: float, mrs20: float) -> str:
    if mrs10 is None or mrs20 is None:
        return "UNKNOWN"
    if mrs10 > 0 and mrs20 > 0:
        return "CONFIRMED"
    elif mrs10 > 0 and mrs20 <= 0:
        return "EARLY_BUY"
    elif mrs10 <= 0 and mrs20 > 0:
        return "LATE_EXIT"
    else:
        return "BEAR"

def main():
    print("L3 Verdict Alignment with MRS Lifecycle")
    print("=" * 70)

    conn = sqlite3.connect(DB_PATH)

    # Load combined data
    query = """
    SELECT
        o.ticker,
        o.date,
        o.close,
        i.mrs_10,
        i.mrs_20,
        l10.verdict as l3_verdict,
        l10.conviction
    FROM stocks_ohlcv o
    JOIN stocks_indicators i ON o.ticker = i.ticker AND o.date = i.date
    LEFT JOIN l3_contracts_10 l10 ON o.ticker = l10.ticker AND o.date = l10.trading_date
    WHERE o.date >= '2024-01-01' AND o.date <= '2025-12-16'
        AND i.mrs_10 IS NOT NULL
        AND i.mrs_20 IS NOT NULL
        AND o.volume > 100000
    ORDER BY o.ticker, o.date
    """

    df = pd.read_sql_query(query, conn)
    conn.close()

    print(f"Loaded {len(df):,} rows")

    # Calculate phases
    df['phase'] = df.apply(lambda r: get_lifecycle_phase(r['mrs_10'], r['mrs_20']), axis=1)

    # Analyze L3 verdict distribution by phase
    print("\nL3 Verdict Distribution by MRS Phase:")
    print("-" * 70)

    for phase in ['BEAR', 'EARLY_BUY', 'CONFIRMED', 'LATE_EXIT']:
        phase_df = df[df['phase'] == phase]
        print(f"\n{phase} ({len(phase_df):,} days):")

        if len(phase_df) == 0:
            continue

        verdict_counts = phase_df['l3_verdict'].value_counts(dropna=False)
        for verdict, count in verdict_counts.items():
            pct = count / len(phase_df) * 100
            verdict_str = verdict if verdict else "NO_L3"
            print(f"  {verdict_str:<10}: {count:>8,} ({pct:>5.1f}%)")

    # Check alignment: CONFIRMED + BUY vs CONFIRMED + other
    print("\n" + "=" * 70)
    print("Forward Return Analysis: CONFIRMED phase with L3 alignment")
    print("-" * 70)

    # Calculate 5-day forward return
    df['fwd_return_5d'] = df.groupby('ticker')['close'].shift(-5) / df['close'] - 1

    confirmed = df[df['phase'] == 'CONFIRMED'].copy()

    for verdict in ['BUY', 'HOLD', 'SELL', 'AVOID', None]:
        if verdict is None:
            subset = confirmed[confirmed['l3_verdict'].isna()]
            label = "NO_L3"
        else:
            subset = confirmed[confirmed['l3_verdict'] == verdict]
            label = verdict

        if len(subset) < 100:
            continue

        fwd_ret = subset['fwd_return_5d'].dropna()
        win_rate = (fwd_ret > 0).mean() * 100
        avg_ret = fwd_ret.mean() * 100

        print(f"  CONFIRMED + {label:<6}: n={len(fwd_ret):>6,}, WR={win_rate:.1f}%, AvgRet={avg_ret:+.2f}%")

    # Same for EARLY_BUY
    print("\nForward Return Analysis: EARLY_BUY phase with L3 alignment")
    print("-" * 70)

    early_buy = df[df['phase'] == 'EARLY_BUY'].copy()

    for verdict in ['BUY', 'HOLD', 'SELL', 'AVOID', None]:
        if verdict is None:
            subset = early_buy[early_buy['l3_verdict'].isna()]
            label = "NO_L3"
        else:
            subset = early_buy[early_buy['l3_verdict'] == verdict]
            label = verdict

        if len(subset) < 100:
            continue

        fwd_ret = subset['fwd_return_5d'].dropna()
        win_rate = (fwd_ret > 0).mean() * 100
        avg_ret = fwd_ret.mean() * 100

        print(f"  EARLY_BUY + {label:<6}: n={len(fwd_ret):>6,}, WR={win_rate:.1f}%, AvgRet={avg_ret:+.2f}%")

    # Test SHORT strategy: Enter on LATE_EXIT
    print("\n" + "=" * 70)
    print("SHORT Strategy: Enter on LATE_EXIT (MRS10 warns, MRS20 holds)")
    print("-" * 70)

    late_exit = df[df['phase'] == 'LATE_EXIT'].copy()

    # Forward return (for short, we want price to go DOWN)
    fwd_ret = late_exit['fwd_return_5d'].dropna()
    short_win_rate = (fwd_ret < 0).mean() * 100  # Win if price goes down
    avg_ret_short = -fwd_ret.mean() * 100  # Flip sign for short P&L

    print(f"  LATE_EXIT (short): n={len(fwd_ret):>6,}, WR={short_win_rate:.1f}%, AvgRet={avg_ret_short:+.2f}%")

    for verdict in ['BUY', 'HOLD', 'SELL', 'AVOID', None]:
        if verdict is None:
            subset = late_exit[late_exit['l3_verdict'].isna()]
            label = "NO_L3"
        else:
            subset = late_exit[late_exit['l3_verdict'] == verdict]
            label = verdict

        if len(subset) < 50:
            continue

        fwd_ret = subset['fwd_return_5d'].dropna()
        short_win_rate = (fwd_ret < 0).mean() * 100
        avg_ret_short = -fwd_ret.mean() * 100

        print(f"  LATE_EXIT + {label:<6}: n={len(fwd_ret):>6,}, WR={short_win_rate:.1f}%, AvgRet(short)={avg_ret_short:+.2f}%")

    # Best combined signal
    print("\n" + "=" * 70)
    print("Best Combined Signals")
    print("-" * 70)

    # CONFIRMED + BUY
    best_long = df[(df['phase'] == 'CONFIRMED') & (df['l3_verdict'] == 'BUY')]
    fwd_ret = best_long['fwd_return_5d'].dropna()
    print(f"\nBest LONG (CONFIRMED + L3 BUY):")
    print(f"  Occurrences: {len(fwd_ret):,}")
    print(f"  Win Rate: {(fwd_ret > 0).mean() * 100:.1f}%")
    print(f"  Avg 5d Return: {fwd_ret.mean() * 100:+.2f}%")
    print(f"  Median 5d Return: {fwd_ret.median() * 100:+.2f}%")

    # LATE_EXIT + SELL/AVOID
    best_short = df[(df['phase'] == 'LATE_EXIT') & (df['l3_verdict'].isin(['SELL', 'AVOID']))]
    fwd_ret = best_short['fwd_return_5d'].dropna()
    print(f"\nBest SHORT (LATE_EXIT + L3 SELL/AVOID):")
    print(f"  Occurrences: {len(fwd_ret):,}")
    print(f"  Win Rate (short): {(fwd_ret < 0).mean() * 100:.1f}%")
    print(f"  Avg 5d Return (short): {-fwd_ret.mean() * 100:+.2f}%")

if __name__ == "__main__":
    main()
