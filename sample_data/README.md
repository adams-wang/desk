# Sample Data for Desk

This folder contains sample data to run the Desk application without the full quant database.

## Data Period

**26 trading days from December 2025 to January 2026:**
- 2025-12-01 through 2025-12-31 (22 trading days)
- 2026-01-02 through 2026-01-07 (4 trading days)

## Contents

### Database (`stocks.db` - 72MB)

| Table | Rows | Description |
|-------|------|-------------|
| `trading_days` | 26 | Trading calendar |
| `stocks_metadata` | 661 | Stock info (ticker, name, sector) |
| `stocks_ohlcv` | 17,186 | Price data (OHLCV) |
| `stocks_indicators` | 17,186 | MRS indicators |
| `stocks_technicals` | 17,186 | RSI, MACD, SMAs |
| `candle_descriptors` | 17,186 | Candle metrics |
| `candle_pattern` | 339 | Pattern detection |
| `gap_signal` | 5,621 | Gap detection |
| `l1_contracts` | 26 | Market regime |
| `l2_contracts` | 26 | Sector rotation meta |
| `l2_sector_rankings` | 286 | Sector rankings |
| `l3_contracts_10_rule` | 17,186 | MRS-10 verdicts |
| `l3_contracts_20_rule` | 17,186 | MRS-20 verdicts |
| `l3_contracts` | (view) | Combined verdicts |
| `indices_ohlcv` | 104 | Index data (SPX, NDX, etc.) |
| `market_sentiment` | 26 | Put/call, breadth |
| `market_regime` | 26 | VIX regime |
| `treasury_yields` | 26 | Yield data |
| `sector_etf_indicators` | 286 | Sector ETF MRS |
| `yfinance_analyst_actions` | 2,149 | Upgrades/downgrades |
| `yfinance_analyst_targets` | 163,459 | Price targets |

**Lookup tables (static):**
- `ofd_interpretation` (84 rows)
- `pattern_interpretation` (21 rows)
- `gap_interpretation` (248 rows)
- `dual_mrs_interpretation` (41 rows)
- `dual_verdict_interpretation` (13 rows)

### Contract JSONs (`contracts/`)

```
contracts/
├── 2025-12-01/
│   ├── l1.json    # Market regime contract
│   └── l2.json    # Sector rotation contract
├── 2025-12-02/
├── ...
├── 2025-12-31/
├── 2026-01-02/
├── 2026-01-05/
├── 2026-01-06/
└── 2026-01-07/
```

All 26 trading days have l1.json and l2.json contracts.

### Reports (`reports/`, `reports_10/`, `reports_20/`)

```
reports/           # L1/L2 market analysis (en, zh, ko, ja)
├── 2025-12-01/
│   ├── L1_Market_Analysis.md
│   ├── L1_Market_Analysis.zh.md
│   ├── L2_Sector_Analysis.md
│   └── ...
├── ...
└── 2026-01-07/

reports_10/        # L3 stock reports (MRS-10, English only) - 130MB
├── 2025-12-01/
│   ├── AAPL.en.md
│   ├── MSFT.en.md
│   └── ... (661 stocks)
├── ...
└── 2026-01-07/

reports_20/        # L3 stock reports (MRS-20, English only) - 131MB
└── (same structure as reports_10)
```

**All reports available for all 26 trading days and all 661 stocks.**

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

- 26 trading days (Dec 1, 2025 - Jan 7, 2026)
- Translation feature requires GLM API key

## Regenerating Sample Data

To regenerate from a fresh quant database:

```bash
# From desk project root
./scripts/create_sample_data.sh
```
