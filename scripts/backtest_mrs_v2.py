#!/usr/bin/env python3
"""
MRS Lifecycle Backtest v2 - User's Exact Definitions

EARLY_BUY:  MRS10 >= 3  AND  MRS20 < 4    (MRS10 leading)
CONFIRMED:  MRS10 >= 3  AND  MRS20 >= 4   (Both in zone)
LATE:       MRS10 < 3   AND  MRS20 >= 4   (MRS10 exiting)
BEAR:       MRS10 < 0   AND  MRS20 < 0    (Both negative)
NEUTRAL:    Everything else               (Transition zones)
"""

import sqlite3
import pandas as pd
import numpy as np

DB_PATH = "/Volumes/Data/quant/data/stocks.db"

def get_phase(mrs10: float, mrs20: float) -> str:
    """User's exact lifecycle definitions."""
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

def run_backtest(df: pd.DataFrame, entry_phases: list, hold_days: int = 5, atr_mult: float = 2.0):
    """Run backtest on phase transitions."""

    df = df.copy()
    df['phase'] = df.apply(lambda r: get_phase(r['mrs_10'], r['mrs_20']), axis=1)
    df['prev_phase'] = df.groupby('ticker')['phase'].shift(1)
    df['phase_changed'] = df['phase'] != df['prev_phase']

    trades = []

    for ticker, ticker_df in df.groupby('ticker'):
        ticker_df = ticker_df.reset_index(drop=True)

        i = 0
        while i < len(ticker_df) - hold_days:
            row = ticker_df.iloc[i]

            # Entry on phase transition into target phases
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

                    # Check stop loss
                    if future_row['low'] <= stop_loss:
                        exit_price = stop_loss
                        exit_reason = "STOP"
                        break

                    # Time exit
                    if j == hold_days:
                        exit_price = future_row['close']
                        exit_reason = "TIME"

                if exit_price:
                    pnl = (exit_price - entry_price) / entry_price * 100
                    trades.append({
                        'ticker': ticker,
                        'entry_date': row['date'],
                        'entry_phase': row['phase'],
                        'prev_phase': row['prev_phase'],
                        'mrs10': row['mrs_10'],
                        'mrs20': row['mrs_20'],
                        'l3_verdict': row['l3_verdict'],
                        'pnl_pct': pnl,
                        'exit_reason': exit_reason,
                    })
                    i += hold_days
                    continue

            i += 1

    return pd.DataFrame(trades)

def analyze_trades(trades: pd.DataFrame, label: str):
    """Analyze trade results."""
    if len(trades) == 0:
        print(f"{label}: No trades")
        return None

    winners = trades[trades['pnl_pct'] > 0]
    losers = trades[trades['pnl_pct'] <= 0]

    win_rate = len(winners) / len(trades) * 100
    avg_ret = trades['pnl_pct'].mean()
    median_ret = trades['pnl_pct'].median()

    gross_profit = winners['pnl_pct'].sum() if len(winners) > 0 else 0
    gross_loss = abs(losers['pnl_pct'].sum()) if len(losers) > 0 else 0.01
    profit_factor = gross_profit / gross_loss

    stopped = trades[trades['exit_reason'] == 'STOP']

    return {
        'label': label,
        'trades': len(trades),
        'win_rate': win_rate,
        'avg_return': avg_ret,
        'median_return': median_ret,
        'profit_factor': profit_factor,
        'stop_pct': len(stopped) / len(trades) * 100,
    }

def main():
    print("=" * 70)
    print("MRS Lifecycle Backtest v2 - User Definitions")
    print("=" * 70)
    print("\nPhase Definitions:")
    print("  EARLY_BUY:  MRS10 >= 3  AND  MRS20 < 4")
    print("  CONFIRMED:  MRS10 >= 3  AND  MRS20 >= 4")
    print("  LATE:       MRS10 < 3   AND  MRS20 >= 4")
    print("  BEAR:       MRS10 < 0   AND  MRS20 < 0")
    print("  NEUTRAL:    Everything else")
    print()

    df = load_data("2024-01-01", "2025-12-16")
    print(f"Loaded {len(df):,} rows for {df['ticker'].nunique()} tickers")

    # Calculate phases
    df['phase'] = df.apply(lambda r: get_phase(r['mrs_10'], r['mrs_20']), axis=1)

    # Phase distribution
    print("\nPhase Distribution:")
    print("-" * 40)
    phase_counts = df['phase'].value_counts()
    for phase, count in phase_counts.items():
        print(f"  {phase:<12}: {count:>8,} ({count/len(df)*100:>5.1f}%)")

    # Forward return analysis (no stop loss, just raw signal)
    print("\n" + "=" * 70)
    print("Forward Return Analysis (5-day, no stop loss)")
    print("-" * 70)

    df['fwd_close'] = df.groupby('ticker')['close'].shift(-5)
    df['fwd_return'] = (df['fwd_close'] - df['close']) / df['close'] * 100

    print(f"{'Phase':<12} {'Count':>10} {'Win%':>8} {'AvgRet':>10} {'MedianRet':>10}")
    print("-" * 55)

    for phase in ['EARLY_BUY', 'CONFIRMED', 'LATE', 'BEAR', 'NEUTRAL']:
        phase_df = df[df['phase'] == phase]
        fwd = phase_df['fwd_return'].dropna()

        if len(fwd) < 100:
            continue

        win_rate = (fwd > 0).mean() * 100
        avg_ret = fwd.mean()
        median_ret = fwd.median()

        print(f"{phase:<12} {len(fwd):>10,} {win_rate:>7.1f}% {avg_ret:>+9.2f}% {median_ret:>+9.2f}%")

    # Transition backtest
    print("\n" + "=" * 70)
    print("Transition Backtest (5-day hold, 2x ATR stop)")
    print("-" * 70)
    print(f"{'Strategy':<30} {'Trades':>8} {'Win%':>8} {'AvgRet':>10} {'PF':>8} {'Stop%':>8}")
    print("-" * 75)

    results = []

    for phases, label in [
        (['EARLY_BUY'], 'EARLY_BUY only'),
        (['CONFIRMED'], 'CONFIRMED only'),
        (['EARLY_BUY', 'CONFIRMED'], 'EARLY_BUY + CONFIRMED'),
    ]:
        trades = run_backtest(df.copy(), phases, hold_days=5, atr_mult=2.0)
        r = analyze_trades(trades, label)
        if r:
            results.append(r)
            print(f"{r['label']:<30} {r['trades']:>8,} {r['win_rate']:>7.1f}% {r['avg_return']:>+9.2f}% {r['profit_factor']:>7.2f} {r['stop_pct']:>7.1f}%")

    # Test different hold periods
    print("\n" + "=" * 70)
    print("Parameter Sensitivity: CONFIRMED entry")
    print("-" * 70)
    print(f"{'Hold':>6} {'ATR':>6} {'Trades':>8} {'Win%':>8} {'AvgRet':>10} {'PF':>8}")
    print("-" * 55)

    for hold_days in [5, 10, 15, 20]:
        for atr_mult in [2.0, 2.5]:
            trades = run_backtest(df.copy(), ['CONFIRMED'], hold_days=hold_days, atr_mult=atr_mult)
            if len(trades) > 0:
                r = analyze_trades(trades, f"{hold_days}d/{atr_mult}x")
                print(f"{hold_days:>6} {atr_mult:>6.1f} {r['trades']:>8,} {r['win_rate']:>7.1f}% {r['avg_return']:>+9.2f}% {r['profit_factor']:>7.2f}")

    # L3 alignment
    print("\n" + "=" * 70)
    print("L3 Alignment Analysis (5-day forward return)")
    print("-" * 70)
    print(f"{'Phase + L3':<30} {'Count':>8} {'Win%':>8} {'AvgRet':>10}")
    print("-" * 60)

    for phase in ['EARLY_BUY', 'CONFIRMED']:
        for verdict in ['BUY', 'HOLD', 'AVOID', None]:
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

            print(f"{label:<30} {len(fwd):>8,} {win_rate:>7.1f}% {avg_ret:>+9.2f}%")

    # Lifecycle transitions
    print("\n" + "=" * 70)
    print("Lifecycle Transitions (where do phases come from?)")
    print("-" * 70)

    df['prev_phase'] = df.groupby('ticker')['phase'].shift(1)
    transitions = df[df['phase'] != df['prev_phase']].dropna(subset=['prev_phase'])

    for to_phase in ['EARLY_BUY', 'CONFIRMED']:
        print(f"\nTransitions INTO {to_phase}:")
        phase_trans = transitions[transitions['phase'] == to_phase]
        from_counts = phase_trans['prev_phase'].value_counts()
        for from_phase, count in from_counts.head(5).items():
            print(f"  {from_phase:<12} -> {to_phase}: {count:>6,}")

if __name__ == "__main__":
    main()
