# Sample Data for Desk

This folder contains sample data to run the Desk application without the full quant database.

## Data Period

**5 trading days from December 2025:**
- 2025-12-24
- 2025-12-26
- 2025-12-29
- 2025-12-30
- 2025-12-31

## Contents

### Database (`stocks.db` - 11MB)

| Table | Rows | Description |
|-------|------|-------------|
| `trading_days` | 5 | Trading calendar |
| `stocks_metadata` | 662 | Stock info (ticker, name, sector) |
| `stocks_ohlcv` | 3,305 | Price data (OHLCV) |
| `stocks_indicators` | 3,305 | MRS indicators |
| `stocks_technicals` | 3,305 | RSI, MACD, SMAs |
| `candle_descriptors` | 3,305 | Candle metrics |
| `candle_pattern` | 52 | Pattern detection |
| `gap_signal` | 536 | Gap detection |
| `l1_contracts` | 5 | Market regime |
| `l2_contracts` | 5 | Sector rotation meta |
| `l2_sector_rankings` | 55 | Sector rankings |
| `l3_contracts_10_rule` | 3,305 | MRS-10 verdicts |
| `l3_contracts_20_rule` | 3,305 | MRS-20 verdicts |
| `l3_contracts` | (view) | Combined verdicts |
| `indices_ohlcv` | 20 | Index data (SPX, NDX, etc.) |
| `market_sentiment` | 5 | Put/call, breadth |
| `market_regime` | 5 | VIX regime |
| `treasury_yields` | 5 | Yield data |
| `sector_etf_indicators` | 55 | Sector ETF MRS |
| `yfinance_analyst_actions` | 39 | Upgrades/downgrades |
| `yfinance_analyst_targets` | 39 | Price targets |

**Lookup tables (static):**
- `ofd_interpretation` (84 rows)
- `pattern_interpretation` (21 rows)
- `gap_interpretation` (248 rows)
- `dual_mrs_interpretation` (41 rows)
- `dual_verdict_interpretation` (13 rows)

### Contract JSONs (`contracts/`)

```
contracts/
├── 2025-12-24/
│   ├── l1.json    # Market regime contract
│   └── l2.json    # Sector rotation contract
├── 2025-12-26/
├── 2025-12-29/
├── 2025-12-30/
└── 2025-12-31/
```

### Reports (`reports/`, `reports_10/`, `reports_20/`)

```
reports/           # L1/L2 market analysis (en, zh, ko, ja)
├── 2025-12-31/
│   ├── L1_Market_Analysis.md
│   ├── L1_Market_Analysis.zh.md
│   ├── L2_Sector_Analysis.md
│   └── ...

reports_10/        # L3 stock reports (MRS-10, English only)
├── 2025-12-31/
│   ├── AAPL.en.md
│   ├── MSFT.en.md
│   └── ... (7 sample tickers)

reports_20/        # L3 stock reports (MRS-20, English only)
└── (same structure as reports_10)
```

**Sample tickers with L3 reports:** AAPL, AMZN, GOOGL, META, MSFT, NVDA, TSLA

## Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Run the dev server:
   ```bash
   pnpm dev
   ```

## Limitations

- Only 5 trading days (Dec 24-31, 2025)
- L3 reports only for 7 sample tickers (other stocks show "Report not found")
- Translation feature requires GLM API key

## Regenerating Sample Data

To regenerate from a fresh quant database:

```bash
# From desk project root
./scripts/create_sample_data.sh
```
