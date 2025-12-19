import { getIndicesOHLCVHistory } from "@/lib/queries/market";
import { getLatestTradingDate } from "@/lib/queries/trading-days";
import { IndicesOHLCVGrid } from "@/components/market";

interface IndicesPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function IndicesPage({ searchParams }: IndicesPageProps) {
  const { date } = await searchParams;
  const latestDate = getLatestTradingDate();
  const currentDate = date || latestDate;

  // Fetch 92 days (50 for SMA50 warm-up + 42 for 2M display)
  const indicesOHLCV = getIndicesOHLCVHistory(92, currentDate);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Indices</h2>
      <IndicesOHLCVGrid indices={indicesOHLCV} />
    </div>
  );
}
