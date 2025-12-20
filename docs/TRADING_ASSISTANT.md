# Trading Assistant Module

AI-powered chat interface for querying trading data and market analysis.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chat UI (React)                          │
│                 /src/app/chat/page.tsx                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ POST /api/chat
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Route                                  │
│              /src/app/api/chat/route.ts                     │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Claude    │───▶│    Tools    │───▶│  Database   │     │
│  │   Sonnet    │◀───│  Execution  │◀───│   Queries   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

Environment variables in `.env.local`:

```bash
# Anthropic API (Relay)
ANTHROPIC_API_KEY="your-api-key"
ANTHROPIC_BASE_URL="https://claude-code.club/api"
```

## Available Tools

Claude has access to 7 database query tools:

### 1. `get_market_overview`
Get current market conditions including regime, VIX, breadth, and indices.

**Parameters:**
- `date` (optional): YYYY-MM-DD format

**Returns:** Regime, confidence, position cap, VIX, breadth, index performance

### 2. `get_stock_detail`
Get detailed information for a specific stock.

**Parameters:**
- `ticker` (required): Stock symbol (e.g., "AAPL")
- `date` (optional): YYYY-MM-DD format

**Returns:** Price, MRS signals, L3 verdicts, RSI, MACD, sector, industry

### 3. `search_stocks`
Search for stocks by ticker or company name.

**Parameters:**
- `query` (required): Search string
- `limit` (optional): Max results (default: 20)

**Returns:** List of matching tickers and company names

### 4. `get_stocks_by_verdict`
Filter stocks by L3 verdict (BUY/SELL).

**Parameters:**
- `verdict` (required): "BUY" or "SELL"
- `timeframe` (optional): "10" (short-term) or "20" (medium-term)
- `limit` (optional): Max results (default: 20)
- `date` (optional): YYYY-MM-DD format

**Returns:** List of stocks with matching verdict

### 5. `get_l3_contracts`
Get full L3 trading contract with entry/stop/target.

**Parameters:**
- `ticker` (required): Stock symbol
- `date` (optional): YYYY-MM-DD format

**Returns:** Both 10-day and 20-day contracts with:
- Verdict, conviction, conviction score
- Entry price, stop loss, target price
- Risk/reward ratio, position sizing

### 6. `get_analyst_sentiment`
Get analyst upgrades/downgrades and price target changes.

**Parameters:**
- `ticker` (required): Stock symbol
- `date` (optional): YYYY-MM-DD format

**Returns:**
- Actions summary (upgrades, downgrades, trend)
- Targets summary (raises, lowers, signal)
- Recent analyst activity

### 7. `get_top_movers`
Get stocks ranked by momentum (MRS).

**Parameters:**
- `direction` (required): "strongest" or "weakest"
- `limit` (optional): Number of stocks (default: 10)
- `date` (optional): YYYY-MM-DD format

**Returns:** Stocks sorted by MRS-20 percentile

## System Prompt

The assistant is configured with trading domain knowledge:

- **Regime**: RISK_ON, NORMAL, RISK_OFF, CRISIS
- **MRS**: Momentum Rank Score (percentile vs peers)
- **L3 Verdict**: AI-generated BUY/SELL/HOLD signals
- **VIX thresholds**: <15 calm, 15-20 normal, 20-25 elevated, >25 fear

## UI Components

### Chat Page (`/chat`)

- Message history with user/assistant bubbles
- Quick-start example buttons
- Markdown rendering for responses
- Loading spinner during API calls
- Enter to submit, Shift+Enter for newline

### Example Queries

- "What's the current market regime?"
- "Show me stocks with L3 buy verdicts"
- "Analyze AAPL for me"
- "What are the top bullish signals today?"
- "Show me the strongest momentum stocks"
- "Get the L3 contract for NVDA"

## Tool Use Flow

1. User sends message
2. API adds trading date context to message
3. Claude receives message + available tools
4. Claude decides which tool(s) to call
5. API executes tool, queries database
6. Claude receives tool results
7. Claude formulates human-readable response
8. Response rendered with markdown

```typescript
// Tool use loop in API route
while (response.stop_reason === "tool_use") {
  const toolResults = await executeTools(response.content);
  response = await client.messages.create({
    messages: [...messages, toolResults],
  });
}
```

## Dependencies

- `@anthropic-ai/sdk` - Claude API client
- `react-markdown` - Markdown rendering
- `lucide-react` - Icons (Bot, User, Send, Loader2)

## Files

```
src/
├── app/
│   ├── chat/
│   │   └── page.tsx          # Chat UI component
│   └── api/
│       └── chat/
│           └── route.ts      # API route with Claude + tools
└── lib/
    └── queries/
        ├── market.ts         # Market overview queries
        ├── stocks.ts         # Stock detail/search queries
        └── trading-days.ts   # Trading date utilities
```
