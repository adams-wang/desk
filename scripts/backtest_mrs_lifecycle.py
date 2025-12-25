#!/usr/bin/env python3
"""
MRS Lifecycle Trading Strategy Backtest

Strategy:
- Entry: Based on MRS10/MRS20 lifecycle phases
- Exit: 5 trading days OR 2*ATR stop loss (whichever first)

Lifecycle Phases:
- BEAR (--): MRS10 <= 0, MRS20 <= 0
- EARLY_BUY (+-): MRS10 > 0, MRS20 <= 0  [Entry signal]
- CONFIRMED (++): MRS10 > 0, MRS20 > 0   [Strong entry]
- LATE_EXIT (-+): MRS10 <= 0, MRS20 > 0  [Exit warning]
"""

import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict

DB_PATH = "/Volumes/Data/quant/data/stocks.db"

def get_lifecycle_phase(mrs10: float, mrs20: float) -> str:
    """Determine lifecycle phase from MRS values."""
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

def load_data(start_date: str = "2024-01-01", end_date: str = "2025-12-16") -> pd.DataFrame:
    """Load OHLCV + indicators + technicals data."""
    conn = sqlite3.connect(DB_PATH)

    query = """
    SELECT
        o.ticker,
        o.date,
        o.open,
        o.high,
        o.low,
        o.close,
        o.volume,
        i.mrs_10,
        i.mrs_20,
        t.atr_14
    FROM stocks_ohlcv o
    JOIN stocks_indicators i ON o.ticker = i.ticker AND o.date = i.date
    JOIN stocks_technicals t ON o.ticker = t.ticker AND o.date = t.date
    WHERE o.date >= ? AND o.date <= ?
        AND i.mrs_10 IS NOT NULL
        AND i.mrs_20 IS NOT NULL
        AND t.atr_14 IS NOT NULL
        AND o.volume > 100000  -- Filter low volume stocks
    ORDER BY o.ticker, o.date
    """

    df = pd.read_sql_query(query, conn, params=(start_date, end_date))
    conn.close()

    print(f"Loaded {len(df):,} rows for {df['ticker'].nunique()} tickers")
    return df

def detect_phase_transitions(df: pd.DataFrame) -> pd.DataFrame:
    """Add lifecycle phase and detect transitions."""
    df = df.copy()

    # Calculate current phase
    df['phase'] = df.apply(lambda r: get_lifecycle_phase(r['mrs_10'], r['mrs_20']), axis=1)

    # Detect phase transitions (previous phase)
    df['prev_phase'] = df.groupby('ticker')['phase'].shift(1)
    df['phase_changed'] = df['phase'] != df['prev_phase']

    return df

def run_backtest(
    df: pd.DataFrame,
    entry_phases: list = ["EARLY_BUY", "CONFIRMED"],
    hold_days: int = 5,
    atr_multiplier: float = 2.0,
    require_transition: bool = True  # Only enter on phase change
) -> pd.DataFrame:
    """
    Run backtest with given parameters.

    Returns DataFrame of trades with entry/exit details.
    """
    trades = []

    # Group by ticker
    for ticker, ticker_df in df.groupby('ticker'):
        ticker_df = ticker_df.reset_index(drop=True)

        i = 0
        while i < len(ticker_df) - hold_days:
            row = ticker_df.iloc[i]

            # Check entry conditions
            is_entry_phase = row['phase'] in entry_phases
            is_transition = row['phase_changed'] if require_transition else True

            if is_entry_phase and is_transition and pd.notna(row['prev_phase']):
                entry_date = row['date']
                entry_price = row['close']
                entry_atr = row['atr_14']
                stop_loss = entry_price - (atr_multiplier * entry_atr)
                entry_phase = row['phase']

                # Track through holding period
                exit_date = None
                exit_price = None
                exit_reason = None
                max_price = entry_price
                min_price = entry_price

                for j in range(1, hold_days + 1):
                    if i + j >= len(ticker_df):
                        break

                    future_row = ticker_df.iloc[i + j]
                    current_low = future_row['low']
                    current_close = future_row['close']

                    max_price = max(max_price, future_row['high'])
                    min_price = min(min_price, current_low)

                    # Check stop loss (intraday)
                    if current_low <= stop_loss:
                        exit_date = future_row['date']
                        exit_price = stop_loss  # Assume stopped out at stop level
                        exit_reason = "STOP_LOSS"
                        break

                    # Check if holding period complete
                    if j == hold_days:
                        exit_date = future_row['date']
                        exit_price = current_close
                        exit_reason = "TIME_EXIT"

                if exit_date and exit_price:
                    pnl_pct = (exit_price - entry_price) / entry_price * 100

                    trades.append({
                        'ticker': ticker,
                        'entry_date': entry_date,
                        'entry_price': entry_price,
                        'entry_phase': entry_phase,
                        'stop_loss': stop_loss,
                        'atr': entry_atr,
                        'exit_date': exit_date,
                        'exit_price': exit_price,
                        'exit_reason': exit_reason,
                        'pnl_pct': pnl_pct,
                        'max_price': max_price,
                        'min_price': min_price,
                        'max_gain_pct': (max_price - entry_price) / entry_price * 100,
                        'max_drawdown_pct': (min_price - entry_price) / entry_price * 100,
                    })

                    # Skip ahead past this trade
                    i += hold_days
                    continue

            i += 1

    return pd.DataFrame(trades)

def analyze_results(trades_df: pd.DataFrame, label: str = ""):
    """Print analysis of backtest results."""
    if len(trades_df) == 0:
        print(f"\n{'='*60}")
        print(f"Results: {label}")
        print("No trades found!")
        return {}

    print(f"\n{'='*60}")
    print(f"Results: {label}")
    print(f"{'='*60}")

    total_trades = len(trades_df)
    winners = trades_df[trades_df['pnl_pct'] > 0]
    losers = trades_df[trades_df['pnl_pct'] <= 0]

    win_rate = len(winners) / total_trades * 100
    avg_return = trades_df['pnl_pct'].mean()
    median_return = trades_df['pnl_pct'].median()
    std_return = trades_df['pnl_pct'].std()

    avg_winner = winners['pnl_pct'].mean() if len(winners) > 0 else 0
    avg_loser = losers['pnl_pct'].mean() if len(losers) > 0 else 0

    # Profit factor
    gross_profit = winners['pnl_pct'].sum() if len(winners) > 0 else 0
    gross_loss = abs(losers['pnl_pct'].sum()) if len(losers) > 0 else 0.01
    profit_factor = gross_profit / gross_loss

    # Expectancy
    expectancy = (win_rate/100 * avg_winner) + ((100-win_rate)/100 * avg_loser)

    # Stop loss analysis
    stopped_out = trades_df[trades_df['exit_reason'] == 'STOP_LOSS']
    time_exit = trades_df[trades_df['exit_reason'] == 'TIME_EXIT']

    print(f"\nTrade Statistics:")
    print(f"  Total Trades:     {total_trades:,}")
    print(f"  Winners:          {len(winners):,} ({win_rate:.1f}%)")
    print(f"  Losers:           {len(losers):,} ({100-win_rate:.1f}%)")

    print(f"\nReturn Statistics:")
    print(f"  Average Return:   {avg_return:+.2f}%")
    print(f"  Median Return:    {median_return:+.2f}%")
    print(f"  Std Dev:          {std_return:.2f}%")
    print(f"  Avg Winner:       {avg_winner:+.2f}%")
    print(f"  Avg Loser:        {avg_loser:+.2f}%")

    print(f"\nRisk Metrics:")
    print(f"  Profit Factor:    {profit_factor:.2f}")
    print(f"  Expectancy:       {expectancy:+.2f}%")
    print(f"  Sharpe (approx):  {avg_return / std_return:.2f}" if std_return > 0 else "  Sharpe: N/A")

    print(f"\nExit Analysis:")
    print(f"  Stop Loss Exits:  {len(stopped_out):,} ({len(stopped_out)/total_trades*100:.1f}%)")
    print(f"  Time Exits:       {len(time_exit):,} ({len(time_exit)/total_trades*100:.1f}%)")

    # Return distribution
    print(f"\nReturn Distribution:")
    print(f"  > +5%:   {len(trades_df[trades_df['pnl_pct'] > 5]):,} ({len(trades_df[trades_df['pnl_pct'] > 5])/total_trades*100:.1f}%)")
    print(f"  +2% to +5%: {len(trades_df[(trades_df['pnl_pct'] > 2) & (trades_df['pnl_pct'] <= 5)]):,}")
    print(f"  0% to +2%:  {len(trades_df[(trades_df['pnl_pct'] > 0) & (trades_df['pnl_pct'] <= 2)]):,}")
    print(f"  -2% to 0%:  {len(trades_df[(trades_df['pnl_pct'] > -2) & (trades_df['pnl_pct'] <= 0)]):,}")
    print(f"  < -2%:   {len(trades_df[trades_df['pnl_pct'] <= -2]):,} ({len(trades_df[trades_df['pnl_pct'] <= -2])/total_trades*100:.1f}%)")

    return {
        'total_trades': total_trades,
        'win_rate': win_rate,
        'avg_return': avg_return,
        'profit_factor': profit_factor,
        'expectancy': expectancy,
    }

def analyze_by_phase(trades_df: pd.DataFrame):
    """Break down results by entry phase."""
    print(f"\n{'='*60}")
    print("BREAKDOWN BY ENTRY PHASE")
    print(f"{'='*60}")

    for phase in trades_df['entry_phase'].unique():
        phase_trades = trades_df[trades_df['entry_phase'] == phase]
        print(f"\n--- {phase} ---")
        print(f"  Trades: {len(phase_trades):,}")
        print(f"  Win Rate: {len(phase_trades[phase_trades['pnl_pct'] > 0]) / len(phase_trades) * 100:.1f}%")
        print(f"  Avg Return: {phase_trades['pnl_pct'].mean():+.2f}%")
        print(f"  Median Return: {phase_trades['pnl_pct'].median():+.2f}%")

def analyze_by_year(trades_df: pd.DataFrame):
    """Break down results by year."""
    print(f"\n{'='*60}")
    print("BREAKDOWN BY YEAR")
    print(f"{'='*60}")

    trades_df = trades_df.copy()
    trades_df['year'] = pd.to_datetime(trades_df['entry_date']).dt.year

    for year in sorted(trades_df['year'].unique()):
        year_trades = trades_df[trades_df['year'] == year]
        winners = year_trades[year_trades['pnl_pct'] > 0]
        print(f"\n--- {year} ---")
        print(f"  Trades: {len(year_trades):,}")
        print(f"  Win Rate: {len(winners) / len(year_trades) * 100:.1f}%")
        print(f"  Avg Return: {year_trades['pnl_pct'].mean():+.2f}%")
        print(f"  Total Return: {year_trades['pnl_pct'].sum():+.1f}%")

def main():
    print("MRS Lifecycle Trading Strategy Backtest")
    print("=" * 60)
    print(f"Period: 2024-01-01 to 2025-12-16")
    print(f"Exit: 5 days OR 2*ATR stop loss")
    print()

    # Load data
    df = load_data("2024-01-01", "2025-12-16")

    # Detect phases
    df = detect_phase_transitions(df)

    # Phase distribution
    print("\nPhase Distribution (all data):")
    phase_counts = df['phase'].value_counts()
    for phase, count in phase_counts.items():
        print(f"  {phase}: {count:,} ({count/len(df)*100:.1f}%)")

    # Transition counts
    transitions = df[df['phase_changed'] == True]
    print(f"\nPhase Transitions: {len(transitions):,}")
    trans_counts = transitions.groupby(['prev_phase', 'phase']).size().sort_values(ascending=False)
    print("\nTop Transitions:")
    for (from_p, to_p), count in trans_counts.head(10).items():
        print(f"  {from_p} -> {to_p}: {count:,}")

    # ========================================
    # BACKTEST 1: Entry on EARLY_BUY transition
    # ========================================
    print("\n" + "=" * 60)
    print("BACKTEST 1: Enter on EARLY_BUY transition (MRS10 turns +)")
    trades_early = run_backtest(
        df,
        entry_phases=["EARLY_BUY"],
        hold_days=5,
        atr_multiplier=2.0,
        require_transition=True
    )
    results_early = analyze_results(trades_early, "EARLY_BUY Entry")

    # ========================================
    # BACKTEST 2: Entry on CONFIRMED transition
    # ========================================
    print("\n" + "=" * 60)
    print("BACKTEST 2: Enter on CONFIRMED transition (MRS10+ & MRS20+)")
    trades_confirmed = run_backtest(
        df,
        entry_phases=["CONFIRMED"],
        hold_days=5,
        atr_multiplier=2.0,
        require_transition=True
    )
    results_confirmed = analyze_results(trades_confirmed, "CONFIRMED Entry")

    # ========================================
    # BACKTEST 3: Entry on either EARLY_BUY or CONFIRMED
    # ========================================
    print("\n" + "=" * 60)
    print("BACKTEST 3: Enter on EARLY_BUY OR CONFIRMED transition")
    trades_both = run_backtest(
        df,
        entry_phases=["EARLY_BUY", "CONFIRMED"],
        hold_days=5,
        atr_multiplier=2.0,
        require_transition=True
    )
    results_both = analyze_results(trades_both, "EARLY_BUY or CONFIRMED")
    analyze_by_phase(trades_both)
    analyze_by_year(trades_both)

    # ========================================
    # COMPARISON SUMMARY
    # ========================================
    print("\n" + "=" * 60)
    print("STRATEGY COMPARISON SUMMARY")
    print("=" * 60)
    print(f"\n{'Strategy':<25} {'Trades':>8} {'Win%':>8} {'AvgRet':>8} {'PF':>8} {'Expect':>8}")
    print("-" * 70)

    for name, results in [
        ("EARLY_BUY", results_early),
        ("CONFIRMED", results_confirmed),
        ("BOTH", results_both),
    ]:
        if results:
            print(f"{name:<25} {results['total_trades']:>8,} {results['win_rate']:>7.1f}% {results['avg_return']:>+7.2f}% {results['profit_factor']:>7.2f} {results['expectancy']:>+7.2f}%")

    # Save detailed trades
    if len(trades_both) > 0:
        output_path = "/Volumes/Data/desk/scripts/backtest_trades.csv"
        trades_both.to_csv(output_path, index=False)
        print(f"\nDetailed trades saved to: {output_path}")

    return trades_both

if __name__ == "__main__":
    trades = main()
