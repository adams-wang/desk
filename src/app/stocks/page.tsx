import { getStockList } from "@/lib/queries/stocks";
import { getSectorRanks } from "@/lib/queries/sectors";
import { StockTable } from "./stock-table";

interface StocksPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function StocksPage({ searchParams }: StocksPageProps) {
  const { date } = await searchParams;
  const stocks = getStockList(200, date);

  // Get official sector rankings from sector ETF data
  const sectorRanksMap = getSectorRanks(date);
  // Convert Map to plain object for serialization to client component
  const sectorRanks = Object.fromEntries(sectorRanksMap);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Stock Edge</h2>
      <StockTable stocks={stocks} sectorRanks={sectorRanks} />
    </div>
  );
}
