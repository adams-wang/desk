#!/usr/bin/env python3
"""
MRS Lifecycle + Both L3 Verdicts (10-day and 20-day)
"""

import sqlite3
import pandas as pd
import numpy as np

DB_PATH = "/Volumes/Data/quant/data/stocks.db"

def get_phase(mrs10: float, mrs20: float) -> str:
    if mrs10 is None or mrs20 is None:
        return "UNKNOWN"
    if mrs10 >= 3 and mrs20 >= 4:
        return "CONFIRMED"
    elif mrs10 >= 3 and mrs20 < 4:
        return "EARLY_BUY"
    elif mrs10 < 3 and mrs20 >= 4:
        return "LATE"
    elif mrs10 < 0 and mrs20 < 0:
        return "BEAR"
    else:
        return "NEUTRAL"

def load_data():
    conn = sqlite3.connect(DB_PATH)
    query = """
    SELECT
        o.ticker, o.date, o.close,
        i.mrs_10, i.mrs_20,
        l10.verdict as l3_10_verdict,
        l20.verdict as l3_20_verdict
    FROM stocks_ohlcv o
    JOIN stocks_indicators i ON o.ticker = i.ticker AND o.date = i.date
    LEFT JOIN l3_contracts_10 l10 ON o.ticker = l10.ticker AND o.date = l10.trading_date
    LEFT JOIN l3_contracts_20 l20 ON o.ticker = l20.ticker AND o.date = l20.trading_date
    WHERE o.date >= '2024-01-01' AND o.date <= '2025-12-16'
        AND i.mrs_10 IS NOT NULL AND i.mrs_20 IS NOT NULL
        AND o.volume > 100000
    ORDER BY o.ticker, o.date
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

def main():
    print("=" * 80)
    print("MRS Lifecycle + L3_10 and L3_20 Verdicts")
    print("=" * 80)

    df = load_data()
    print(f"Loaded {len(df):,} rows")

    # Calculate phase and forward returns
    df['phase'] = df.apply(lambda r: get_phase(r['mrs_10'], r['mrs_20']), axis=1)
    df['fwd_5d'] = df.groupby('ticker')['close'].shift(-5) / df['close'] - 1
    df['fwd_10d'] = df.groupby('ticker')['close'].shift(-10) / df['close'] - 1
    df['fwd_20d'] = df.groupby('ticker')['close'].shift(-20) / df['close'] - 1

    # L3_10 verdict analysis with MRS phase
    print("\n" + "=" * 80)
    print("L3_10 Verdict + MRS Phase (5-day forward return)")
    print("-" * 80)
    print(f"{'Phase':<12} {'L3_10':<8} {'Count':>8} {'Win%':>8} {'AvgRet':>10}")
    print("-" * 50)

    for phase in ['EARLY_BUY', 'CONFIRMED', 'LATE']:
        for verdict in ['BUY', 'HOLD', 'SELL', 'AVOID', None]:
            if verdict is None:
                subset = df[(df['phase'] == phase) & (df['l3_10_verdict'].isna())]
                v_label = "NO_L3"
            else:
                subset = df[(df['phase'] == phase) & (df['l3_10_verdict'] == verdict)]
                v_label = verdict

            fwd = subset['fwd_5d'].dropna() * 100
            if len(fwd) < 20:
                continue

            print(f"{phase:<12} {v_label:<8} {len(fwd):>8,} {(fwd>0).mean()*100:>7.1f}% {fwd.mean():>+9.2f}%")

    # L3_20 verdict analysis with MRS phase
    print("\n" + "=" * 80)
    print("L3_20 Verdict + MRS Phase (10-day forward return)")
    print("-" * 80)
    print(f"{'Phase':<12} {'L3_20':<8} {'Count':>8} {'Win%':>8} {'AvgRet':>10}")
    print("-" * 50)

    for phase in ['EARLY_BUY', 'CONFIRMED', 'LATE']:
        for verdict in ['BUY', 'HOLD', 'SELL', 'AVOID', None]:
            if verdict is None:
                subset = df[(df['phase'] == phase) & (df['l3_20_verdict'].isna())]
                v_label = "NO_L3"
            else:
                subset = df[(df['phase'] == phase) & (df['l3_20_verdict'] == verdict)]
                v_label = verdict

            fwd = subset['fwd_10d'].dropna() * 100
            if len(fwd) < 20:
                continue

            print(f"{phase:<12} {v_label:<8} {len(fwd):>8,} {(fwd>0).mean()*100:>7.1f}% {fwd.mean():>+9.2f}%")

    # Combined L3_10 + L3_20
    print("\n" + "=" * 80)
    print("Combined: L3_10 + L3_20 both BUY")
    print("-" * 80)

    for phase in ['EARLY_BUY', 'CONFIRMED', 'LATE', 'NEUTRAL', 'BEAR']:
        # Both L3 = BUY
        both_buy = df[(df['phase'] == phase) &
                      (df['l3_10_verdict'] == 'BUY') &
                      (df['l3_20_verdict'] == 'BUY')]

        fwd_5d = both_buy['fwd_5d'].dropna() * 100
        fwd_10d = both_buy['fwd_10d'].dropna() * 100

        if len(fwd_5d) < 10:
            continue

        print(f"\n{phase} + L3_10=BUY + L3_20=BUY:")
        print(f"  Count: {len(fwd_5d):,}")
        print(f"  5d:  WR={(fwd_5d>0).mean()*100:.1f}%, Avg={fwd_5d.mean():+.2f}%")
        print(f"  10d: WR={(fwd_10d>0).mean()*100:.1f}%, Avg={fwd_10d.mean():+.2f}%")

    # L3_10 BUY only (no L3_20 or L3_20 != BUY)
    print("\n" + "=" * 80)
    print("L3_10=BUY only (L3_20 is NOT BUY)")
    print("-" * 80)

    for phase in ['EARLY_BUY', 'CONFIRMED']:
        l3_10_only = df[(df['phase'] == phase) &
                        (df['l3_10_verdict'] == 'BUY') &
                        (df['l3_20_verdict'] != 'BUY')]

        fwd = l3_10_only['fwd_5d'].dropna() * 100
        if len(fwd) < 10:
            continue

        print(f"{phase} + L3_10=BUY only: n={len(fwd):,}, WR={(fwd>0).mean()*100:.1f}%, Avg={fwd.mean():+.2f}%")

    # L3_20 BUY only
    print("\n" + "=" * 80)
    print("L3_20=BUY only (L3_10 is NOT BUY)")
    print("-" * 80)

    for phase in ['EARLY_BUY', 'CONFIRMED']:
        l3_20_only = df[(df['phase'] == phase) &
                        (df['l3_20_verdict'] == 'BUY') &
                        (df['l3_10_verdict'] != 'BUY')]

        fwd = l3_20_only['fwd_10d'].dropna() * 100
        if len(fwd) < 10:
            continue

        print(f"{phase} + L3_20=BUY only: n={len(fwd):,}, WR={(fwd>0).mean()*100:.1f}%, Avg={fwd.mean():+.2f}%")

    # Summary: Best signals
    print("\n" + "=" * 80)
    print("SUMMARY: Best Signal Combinations")
    print("-" * 80)

    signals = [
        ('CONFIRMED + L3_10=BUY',
         df[(df['phase'] == 'CONFIRMED') & (df['l3_10_verdict'] == 'BUY')], 5),
        ('CONFIRMED + L3_20=BUY',
         df[(df['phase'] == 'CONFIRMED') & (df['l3_20_verdict'] == 'BUY')], 10),
        ('CONFIRMED + BOTH=BUY',
         df[(df['phase'] == 'CONFIRMED') & (df['l3_10_verdict'] == 'BUY') & (df['l3_20_verdict'] == 'BUY')], 10),
        ('EARLY_BUY + L3_10=BUY',
         df[(df['phase'] == 'EARLY_BUY') & (df['l3_10_verdict'] == 'BUY')], 5),
        ('EARLY_BUY + L3_20=BUY',
         df[(df['phase'] == 'EARLY_BUY') & (df['l3_20_verdict'] == 'BUY')], 10),
        ('CONFIRMED (no L3)',
         df[(df['phase'] == 'CONFIRMED') & (df['l3_10_verdict'].isna()) & (df['l3_20_verdict'].isna())], 5),
    ]

    print(f"{'Signal':<30} {'N':>8} {'Horizon':>8} {'Win%':>8} {'AvgRet':>10}")
    print("-" * 70)

    for label, subset, horizon in signals:
        if horizon == 5:
            fwd = subset['fwd_5d'].dropna() * 100
        elif horizon == 10:
            fwd = subset['fwd_10d'].dropna() * 100
        else:
            fwd = subset['fwd_20d'].dropna() * 100

        if len(fwd) < 10:
            continue

        print(f"{label:<30} {len(fwd):>8,} {horizon:>7}d {(fwd>0).mean()*100:>7.1f}% {fwd.mean():>+9.2f}%")

if __name__ == "__main__":
    main()
