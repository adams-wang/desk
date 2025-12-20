import { getStockList } from "@/lib/queries/stocks";
import { getLatestTradingDate } from "@/lib/queries/trading-days";
import { StockTable } from "./stock-table";

export default function StocksPage() {
  const tradingDate = getLatestTradingDate();
  const stocks = getStockList(1000);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Stock Screener</h2>
        <p className="text-muted-foreground">
          Browse stocks with L3 signals • Data as of {tradingDate}
        </p>
      </div>

      <StockTable stocks={stocks} />
    </div>
  );
}
