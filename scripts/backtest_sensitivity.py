#!/usr/bin/env python3
"""
Parameter Sensitivity Analysis for MRS Lifecycle Strategy
"""

import sqlite3
import pandas as pd
import numpy as np
from backtest_mrs_lifecycle import load_data, detect_phase_transitions, run_backtest

def run_sensitivity_analysis():
    print("MRS Lifecycle Strategy - Parameter Sensitivity Analysis")
    print("=" * 70)

    # Load data once
    df = load_data("2024-01-01", "2025-12-16")
    df = detect_phase_transitions(df)

    # Parameter ranges to test
    hold_days_range = [3, 5, 7, 10, 15, 20]
    atr_multipliers = [1.5, 2.0, 2.5, 3.0]

    results = []

    print("\nTesting CONFIRMED entry with various parameters...")
    print(f"\n{'Hold':>6} {'ATR':>6} {'Trades':>8} {'Win%':>8} {'AvgRet':>8} {'PF':>8} {'StopOut%':>9}")
    print("-" * 70)

    for hold_days in hold_days_range:
        for atr_mult in atr_multipliers:
            trades = run_backtest(
                df,
                entry_phases=["CONFIRMED"],
                hold_days=hold_days,
                atr_multiplier=atr_mult,
                require_transition=True
            )

            if len(trades) == 0:
                continue

            winners = trades[trades['pnl_pct'] > 0]
            losers = trades[trades['pnl_pct'] <= 0]
            win_rate = len(winners) / len(trades) * 100
            avg_return = trades['pnl_pct'].mean()

            gross_profit = winners['pnl_pct'].sum() if len(winners) > 0 else 0
            gross_loss = abs(losers['pnl_pct'].sum()) if len(losers) > 0 else 0.01
            profit_factor = gross_profit / gross_loss

            stopped = trades[trades['exit_reason'] == 'STOP_LOSS']
            stop_pct = len(stopped) / len(trades) * 100

            print(f"{hold_days:>6} {atr_mult:>6.1f} {len(trades):>8,} {win_rate:>7.1f}% {avg_return:>+7.2f}% {profit_factor:>7.2f} {stop_pct:>8.1f}%")

            results.append({
                'hold_days': hold_days,
                'atr_mult': atr_mult,
                'trades': len(trades),
                'win_rate': win_rate,
                'avg_return': avg_return,
                'profit_factor': profit_factor,
                'stop_pct': stop_pct,
            })

    # Find best combinations
    results_df = pd.DataFrame(results)

    print("\n" + "=" * 70)
    print("TOP 5 by Average Return:")
    print("-" * 70)
    top_return = results_df.nlargest(5, 'avg_return')
    for _, r in top_return.iterrows():
        print(f"  Hold={r['hold_days']}d, ATR={r['atr_mult']:.1f}x -> AvgRet={r['avg_return']:+.2f}%, WR={r['win_rate']:.1f}%, PF={r['profit_factor']:.2f}")

    print("\nTOP 5 by Profit Factor:")
    print("-" * 70)
    top_pf = results_df.nlargest(5, 'profit_factor')
    for _, r in top_pf.iterrows():
        print(f"  Hold={r['hold_days']}d, ATR={r['atr_mult']:.1f}x -> PF={r['profit_factor']:.2f}, WR={r['win_rate']:.1f}%, AvgRet={r['avg_return']:+.2f}%")

    print("\nTOP 5 by Win Rate:")
    print("-" * 70)
    top_wr = results_df.nlargest(5, 'win_rate')
    for _, r in top_wr.iterrows():
        print(f"  Hold={r['hold_days']}d, ATR={r['atr_mult']:.1f}x -> WR={r['win_rate']:.1f}%, AvgRet={r['avg_return']:+.2f}%, PF={r['profit_factor']:.2f}")

    # Test EARLY_BUY vs CONFIRMED comparison at optimal settings
    print("\n" + "=" * 70)
    print("EARLY_BUY vs CONFIRMED at Hold=10d, ATR=2.5x")
    print("-" * 70)

    for phase in ["EARLY_BUY", "CONFIRMED"]:
        trades = run_backtest(
            df,
            entry_phases=[phase],
            hold_days=10,
            atr_multiplier=2.5,
            require_transition=True
        )
        winners = trades[trades['pnl_pct'] > 0]
        losers = trades[trades['pnl_pct'] <= 0]
        win_rate = len(winners) / len(trades) * 100
        avg_return = trades['pnl_pct'].mean()
        gross_profit = winners['pnl_pct'].sum() if len(winners) > 0 else 0
        gross_loss = abs(losers['pnl_pct'].sum()) if len(losers) > 0 else 0.01
        profit_factor = gross_profit / gross_loss

        print(f"  {phase:<12}: Trades={len(trades):,}, WR={win_rate:.1f}%, AvgRet={avg_return:+.2f}%, PF={profit_factor:.2f}")

    # Test filtering by conviction (if L3 signal aligns)
    print("\n" + "=" * 70)
    print("Adding L3 Verdict Filter (CONFIRMED + L3 BUY)")
    print("-" * 70)

    # We need to add L3 verdict to the data first
    conn = sqlite3.connect("/Volumes/Data/quant/data/stocks.db")
    l3_query = """
    SELECT ticker, trading_date as date, verdict, conviction
    FROM l3_contracts_10
    WHERE trading_date >= '2024-01-01'
    """
    l3_df = pd.read_sql_query(l3_query, conn)
    conn.close()

    # Merge with main data
    df_with_l3 = df.merge(l3_df, on=['ticker', 'date'], how='left')

    # Filter for CONFIRMED with L3 BUY
    df_l3_buy = df_with_l3[df_with_l3['verdict'] == 'BUY'].copy()
    df_l3_buy = detect_phase_transitions(df_l3_buy)

    trades_l3 = run_backtest(
        df_l3_buy,
        entry_phases=["CONFIRMED"],
        hold_days=10,
        atr_multiplier=2.5,
        require_transition=True
    )

    if len(trades_l3) > 0:
        winners = trades_l3[trades_l3['pnl_pct'] > 0]
        losers = trades_l3[trades_l3['pnl_pct'] <= 0]
        win_rate = len(winners) / len(trades_l3) * 100
        avg_return = trades_l3['pnl_pct'].mean()
        gross_profit = winners['pnl_pct'].sum() if len(winners) > 0 else 0
        gross_loss = abs(losers['pnl_pct'].sum()) if len(losers) > 0 else 0.01
        profit_factor = gross_profit / gross_loss

        print(f"  CONFIRMED + L3 BUY: Trades={len(trades_l3):,}, WR={win_rate:.1f}%, AvgRet={avg_return:+.2f}%, PF={profit_factor:.2f}")
    else:
        print("  No trades found with L3 BUY filter")

if __name__ == "__main__":
    run_sensitivity_analysis()
